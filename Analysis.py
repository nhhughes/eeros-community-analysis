#! /usr/bin/env python
__author__ = 'nathan'

import networkx as nx
import sys
import re
import time
from progressbar import ProgressBar
from progressbar.widgets import Bar


def get_commit_tree_json(repo):
    import json
    from networkx.readwrite import json_graph
    with open('./data/' + repo + ':commits', 'r') as f:
        data = f.read()
        json_data = json.loads(data)
        return json_graph.node_link_graph(json_data)


def clean_up_commit_tree(tree):
    new_tree = nx.DiGraph()
    for i in tree.nodes():
        new_tree.add_node(tree.node[i]['hexsha'], author=tree.node[i]['author'],
                          date=tree.node[i]['authored_date'], diff=tree.node[i]['diff'])
    for i in tree.edges():
        new_tree.add_edge(tree.node[i[0]]['hexsha'], tree.node[i[1]]['hexsha'])
    return new_tree


def get_graph_info(graph):
    communicability_centrality = nx.communicability_centrality(graph)
    return communicability_centrality


def make_diff_string(diff_set):
    s = ""
    s += diff_set[0][5:] + ":"
    s += diff_set[1][5:]
    changes = diff_set[2]
    p = re.compile('(\d+),(\d+)')
    results = p.findall(changes)
    if len(results) != 2:
        s += ":0:0:0:0"
    else:
        s += ":" + results[0][0] + ":" + results[0][1] + ":" + results[1][0] + ":" + results[1][1]
    return s


def process_diff(diff_text):
    p = re.compile('(-{3} .*)\n(\+{3} .*)\n(@{2}.*@{2})')
    matches = p.findall(diff_text)
    diff_strings = [make_diff_string(i) for i in matches]
    return diff_strings


def update_commit_tree_with_diffs(tree):
    progress = ProgressBar(widgets=['Processing File Differences', Bar()])
    for node in progress(tree.nodes()):
        tree.node[node]['diff'] = process_diff(tree.node[node]['diff'])


def create_community_actors(tree, date):
    graph = nx.Graph()
    attributes = nx.get_node_attributes(tree, 'author')
    dates = nx.get_node_attributes(tree, 'date')
    y = lambda x: time.strptime(date, "%Y-%m-%dT%H:%M:%SZ") >= time.strptime(x, "%Y-%m-%dT%H:%M:%SZ")
    filtered_dict = {k: v for (k, v) in dates.iteritems() if y(v)}
    actors = set()
    for i in filtered_dict.keys():
        actors.add(attributes[i])
    for actor in actors:
        print actor
        graph.add_node(actor, name=actor)
    for u in graph.nodes():
        for v in graph.nodes():
            graph.add_edge(u, v, weight=0.)
    return graph


def update_edge(actors, child, parent, diffs, author):
    child_diff = diffs[child]
    parent_diff = diffs[parent]

    strong_interactions = 0
    weak_interactions = 0

    lines_edited = {}

    for diff_piece in child_diff:

        info = diff_piece.split(":")
        if info[0] != info[1] and info[0] == 'dev/null':
            pass
        else:
            if int(info[3]) > int(info[5]):
                local_lines_edited = set(range(int(info[2]) + int(info[3])))
            else:
                local_lines_edited = set(range(int(info[4]) + int(info[5])))
            lines_edited[info[1]] = local_lines_edited

    for diff_piece in parent_diff:

        info = diff_piece.split(":")
        if info[0] != info[1] and info[1] == 'dev/null':
            pass
        else:
            file_edited = info[0]
            if int(info[3]) > int(info[5]):
                local_lines_edited = range(int(info[2]) + int(info[3]))
            else:
                local_lines_edited = range(int(info[4]) + int(info[5]))
            if file_edited in lines_edited:
                for i in local_lines_edited:
                    if i in lines_edited[file_edited]:
                        strong_interactions += 1
                        break
                else:
                    weak_interactions += 1

    weight = weak_interactions * 0.1 + strong_interactions * 0.5
    actors[author[parent]][author[child]]['weight'] += weight
    actors[author[child]][author[parent]]['weight'] += weight


def update_actor_network(actors, valid_commits, parent_tree, authors, diffs):
    for node in valid_commits:
        parents = parent_tree[node].keys()
        for parent in parents:
            update_edge(actors, node, parent, diffs, authors)


def filter_edges_by_weight(graph, threshold):
    graph_copy = graph.copy()
    edges_to_remove = []
    for edge in graph.edges():
        if graph[edge[0]][edge[1]]['weight'] < threshold:
            edges_to_remove.append(edge)
    graph_copy.remove_edges_from(edges_to_remove)
    return graph_copy


def update_actors(tree, valid_commits, actors):
    authors = set(map(lambda x: tree.node[x]['author'], valid_commits))
    to_add = filter(lambda x: x not in actors.nodes(), authors)
    for author in to_add:
        actors.add_node(author, name=author)
    for actor in to_add:
        for node in actors.nodes():
            actors.add_edge(actor, node, weight=0.)


def update_total_graph(update, graph, date):
    for e in update.edges():

        if e[0] not in graph:
            graph.add_node(e[0], **update.node[e[0]])
        if e[1] not in graph:
            graph.add_node(e[1], **update.node[e[1]])
        if e[0] not in graph[e[1]]:
            graph.add_edge(e[0], e[1], start=[date], weight={date: update[e[0]][e[1]]['weight']}, ends=[], current=True)
        else:
            if not graph[e[0]][e[1]]['current']:
                graph[e[0]][e[1]]['start'].append(date)
                graph[e[0]][e[1]]['current'] = True
            graph[e[0]][e[1]]['weight'][date] = update[e[0]][e[1]]['weight']
    for e in graph.edges():
        if e[0] not in update[e[1]] and graph[e[1]][e[0]]['current']:
            graph[e[1]][e[0]]['ends'].append(date)
            graph[e[1]][e[0]]['current'] = False


def process_days(tree, parent_tree, repo):
    sorted_commits = sorted(tree.nodes(), key=lambda x: time.mktime(time.strptime(tree.node[x]['date'],
                                                                                  "%Y-%m-%dT%H:%M:%SZ")))
    start_date = min(map(lambda x: time.mktime(time.strptime(tree.node[x]['date'], "%Y-%m-%dT%H:%M:%SZ")),
                         tree.nodes()))
    stop_date = time.time()

    total_graph = nx.Graph()

    authors_dict = nx.get_node_attributes(tree, 'author')
    diffs_dict = nx.get_node_attributes(tree, 'diff')

    dates = range(int(start_date), int(stop_date), 86400*7)

    progress = ProgressBar(widgets=['Analyzing community by week', Bar()])

    actors = create_community_actors(tree, time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(dates[0])))
    prev_date = dates[0]

    health_values = []
    for date in progress(dates[1:]):
        valid_commits = filter(
            lambda x: prev_date < time.mktime(time.strptime(tree.node[x]['date'], "%Y-%m-%dT%H:%M:%SZ")) < date,
            sorted_commits)
        update_actors(tree, valid_commits, actors)
        update_actor_network(actors, valid_commits, parent_tree, authors_dict, diffs_dict)

        to_display = filter_edges_by_weight(actors, 0.5)

        health = nx.estrada_index(to_display)
        health_values.append(health)

        update_total_graph(to_display, total_graph, date)

    finalize_graph(dates[-1], total_graph)
    store_all_results_json(total_graph, health_values, repo)


def finalize_graph(end_date, actors):
    for edge in actors.edges():
        if len(actors[edge[0]][edge[1]]['start']) > len(actors[edge[0]][edge[1]]['ends']):
            actors[edge[0]][edge[1]]['ends'].append(end_date)
        if len(actors[edge[1]][edge[0]]['start']) > len(actors[edge[1]][edge[0]]['ends']):
            actors[edge[1]][edge[0]]['ends'].append(end_date)


def store_all_results_json(total_graph, health_values, repo):
    from networkx.readwrite import json_graph
    import json
    total_graph.graph['health'] = health_values
    data = json_graph.node_link_data(total_graph)
    with open('./data/' + repo + ':actors', 'w') as f:
        json.dump(data, f)


def main():
    print '\n', "*" * 80
    s = "* Welcome to the EEROS IQP Team Community Analysis Tool"
    s += " " * (79 - len(s))
    s += "*"
    print s
    print "*" * 80, "\n"
    if len(sys.argv) != 3:
        print "Invalid Arguments!"
        print "Usage: ./Analysis u|r Repository-Name"
        exit(1)
    if not (sys.argv[1] == 'r' or sys.argv[1] == 'u'):
        print "Invalid Arguments!"
        print "Usage: ./Analysis u|r Repository-Name"
        exit(1)
    repo = sys.argv[2]

    tree = clean_up_commit_tree(get_commit_tree_json(repo))
    parent_tree = tree.reverse()

    update_commit_tree_with_diffs(tree)

    if sys.argv[1] == 'r':
        process_days(tree, parent_tree, repo)
    else:
        pass

    print "Finished analysis!"
    print


if __name__ == '__main__':
    main()
