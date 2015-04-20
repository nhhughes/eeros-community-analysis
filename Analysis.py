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
    for node in graph.nodes():
        importance = 0.
        for edge in graph[node]:
            importance += graph[node][edge]['weight'][date]
        graph.node[node]['importance'][date] = importance


def traverse_graph(root, graph, total_graph, health_values):
    from collections import deque
    frontier = deque()
    visited = set([])
    frontier.append((root, None))
    while len(frontier) > 0:
        curr, parent = frontier.popleft()
        do_something(curr, graph, total_graph, parent, health_values)
        if curr not in visited:
            visited.add(curr)
            for child in graph[curr]:
                if child not in visited:
                    frontier.append((child, curr))
        else:
            print "duplicate visitation!"


def do_something(root, tree, total_graph, parent, health_values):
    update_actors(tree, total_graph, root)
    date = tree.node[root]['date']
    date = time.mktime(time.strptime(date, "%Y-%m-%dT%H:%M:%SZ"))
    if parent:
        update_edge(total_graph, root, parent, tree)
    for node in total_graph.nodes():
        importance = 0.
        for edge in total_graph[node]:
            importance += total_graph[node][edge]['weight']
        total_graph.node[node]['importance'][date] = importance
    health_values.append((tree.node[root]['date'], nx.estrada_index(total_graph)))


def update_edge(actors, child, parent, tree):
    child_diff = tree.node[child]['diff']
    parent_diff = tree.node[parent]['diff']

    date = tree.node[child]['date']
    to_update_with = time.mktime(time.strptime(date, "%Y-%m-%dT%H:%M:%SZ"))

    child_author = tree.node[child]['author']
    parent_author = tree.node[parent]['author']

    if child_author == parent_author:
        return

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
    if parent_author not in actors[child_author]:
        actors.add_edge(parent_author, child_author, weights={to_update_with: weight}, weight=weight,
                        start=[to_update_with], end=[])
    else:
        new_weight = actors[child_author][parent_author]['weight'] + weight
        actors[child_author][parent_author]['weights'][to_update_with] = new_weight
        actors[parent_author][child_author]['weights'][to_update_with] = new_weight
        actors[child_author][parent_author]['weight'] = new_weight
        actors[parent_author][child_author]['weight'] = new_weight


def update_actors(tree, actors, root):
    author = tree.node[root]['author']
    if author not in actors:
        date = tree.node[root]['date']
        to_update_with = time.mktime(time.strptime(date, "%Y-%m-%dT%H:%M:%SZ"))
        actors.add_node(author, name=author, entrance=to_update_with, importance={})


def process_days(tree, repo):
    total_graph = nx.Graph()

    health_values = []

    degrees = tree.in_degree()
    root = filter(lambda x: degrees[x] == 0, degrees)[0]
    traverse_graph(root, tree, total_graph, health_values)

    ending_date = max(map(lambda x: time.mktime(time.strptime(tree.node[x]['date'], "%Y-%m-%dT%H:%M:%SZ")), tree))
    finalize_graph(ending_date, total_graph)
    store_all_results_json(total_graph, health_values, repo)


def finalize_graph(end_date, actors):
    for edge in actors.edges():
        if len(actors[edge[0]][edge[1]]['start']) > len(actors[edge[0]][edge[1]]['end']):
            actors[edge[0]][edge[1]]['end'].append(end_date)
        if len(actors[edge[1]][edge[0]]['start']) > len(actors[edge[1]][edge[0]]['end']):
            actors[edge[1]][edge[0]]['end'].append(end_date)


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

    update_commit_tree_with_diffs(tree)

    if sys.argv[1] == 'r':
        process_days(tree, repo)
    else:
        pass

    print "Finished analysis!"
    print


if __name__ == '__main__':
    main()
