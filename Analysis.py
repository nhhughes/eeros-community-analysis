#! /usr/bin/env python
__author__ = 'nathan'

import networkx as nx
import sys
import re
import time
from progressbar import ProgressBar
from progressbar.widgets import Bar
from Queue import PriorityQueue
import numpy as np


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


def clean_up_commit_tree(tree):
    new_tree = nx.DiGraph()
    for i in tree.nodes():
        new_tree.add_node(tree.node[i]['hexsha'], author=tree.node[i]['author'],
                          date=tree.node[i]['authored_date'], diff=tree.node[i]['diff'])
    for i in tree.edges():
        new_tree.add_edge(tree.node[i[0]]['hexsha'], tree.node[i[1]]['hexsha'])
    return new_tree


def get_commit_tree_json(repo):
    import json
    from networkx.readwrite import json_graph

    with open('./data/' + repo + ':commits', 'r') as f:
        data = f.read()
        json_data = json.loads(data)
        return json_graph.node_link_graph(json_data)


def update_commit_tree_with_diffs(tree):
    progress = ProgressBar(widgets=['Processing File Differences', Bar()])
    for node in tree.nodes():
        tree.node[node]['diff'] = process_diff(tree.node[node]['diff'])


def process_diff(diff_text):
    p = re.compile('(-{3} .*)\n(\+{3} .*)\n(@{2}.*@{2})')
    matches = p.findall(diff_text)
    diff_strings = [make_diff_string(i) for i in matches]
    return diff_strings


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


def process_days(tree, repo, edge_tolerance=0.5, init_time_val=5, deprecation_val=1):
    total_graph = nx.Graph()

    health_values = []
    commit_count = []
    actor_count = []
    closeness_values = []

    degrees = tree.in_degree()
    root = filter(lambda x: degrees[x] == 0, degrees)[0]
    traverse_graph(root, tree, total_graph, health_values, commit_count, actor_count, closeness_values,
                   edge_tolerance=edge_tolerance, init_time_val=init_time_val, deprecation_val=deprecation_val)

    ending_date = max(map(lambda x: time.mktime(time.strptime(tree.node[x]['date'], "%Y-%m-%dT%H:%M:%SZ")), tree))
    finalize_graph(ending_date, total_graph)
    store_all_results_json(total_graph, health_values, commit_count, actor_count, closeness_values, repo)


def traverse_graph(root, graph, total_graph, health_values, commit_count, actor_count, closeness_values,
                   edge_tolerance=0.5, init_time_val=5, deprecation_val=1):
    file_diffs = {}
    traverse_count = 0
    frontier = PriorityQueue()
    visited = set([])
    frontier.put((graph.node[root]['date'], (root, None)))
    while not frontier.empty():
        curr, parent = frontier.get()[1]
        traverse_count += 1
        do_something(curr, graph, total_graph, parent, health_values, file_diffs, commit_count, actor_count,
                     closeness_values, edge_tolerance=edge_tolerance, init_time_val=init_time_val,
                     deprecation_val=deprecation_val)
        if curr not in visited:
            visited.add(curr)
            for child in graph[curr]:
                if child not in visited:
                    frontier.put((graph.node[child]['date'], (child, curr)))


def do_something(root, tree, total_graph, parent, health_values, file_diffs, commit_count, actor_count,
                 closeness_values, edge_tolerance=0.5, init_time_val=5, deprecation_val=1):
    update_actors(tree, total_graph, root)
    date = tree.node[root]['date']
    date = time.mktime(time.strptime(date, "%Y-%m-%dT%H:%M:%SZ"))
    if parent:
        update_edge(total_graph, root, parent, tree, file_diffs, edge_tolerance=edge_tolerance,
                    init_time_val=init_time_val, deprecation_val=deprecation_val)
    for node in total_graph.nodes():
        importance = 0.
        for edge in total_graph[node]:
            importance += total_graph[node][edge]['weight']
        total_graph.node[node]['importance'][date] = importance
    health_values.append((date, nx.estrada_index(total_graph)))
    closeness_values.append((date, np.mean(nx.closeness_centrality(total_graph).values())))
    actor_count.append((date, len(total_graph)))
    if len(commit_count) > 0:
        commit_count.append((date, commit_count[-1][1] + 1))
    else:
        commit_count.append((date, 1))


def update_actors(tree, actors, root):
    author = tree.node[root]['author']
    if author not in actors:
        date = tree.node[root]['date']
        to_update_with = time.mktime(time.strptime(date, "%Y-%m-%dT%H:%M:%SZ"))
        actors.add_node(author, name=author, entrance=to_update_with, importance={})


def update_edge(actors, child, parent, tree, file_diffs, edge_tolerance=0.5, init_time_val=5, deprecation_val=1):
    child_diff = tree.node[child]['diff']
    parent_diff = tree.node[parent]['diff']

    date = tree.node[child]['date']
    to_update_with = time.mktime(time.strptime(date, "%Y-%m-%dT%H:%M:%SZ"))

    child_author = tree.node[child]['author']
    parent_author = tree.node[parent]['author']

    if child_author == parent_author:
        return

    strong_interactions = get_direct_interactions(child_diff, parent_diff)
    weak_interactions, files_edited = get_indirect_interactions(child_diff, file_diffs)
    update_file_diffs(file_diffs, files_edited, child_author, init_time_val=init_time_val,
                      deprecation_val=deprecation_val)

    for author in weak_interactions:
        if author != child_author:
            if author != parent_author:
                weight = weak_interactions[author] * 0.1
            else:
                weight = weak_interactions[author] * 0.1 + strong_interactions * 0.5
            update_weight_values(weight, to_update_with, parent_author, child_author, actors,
                                 edge_tolerance=edge_tolerance)


def get_direct_interactions(child_diff, parent_diff):
    strong_interactions = 0
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

    return strong_interactions


def get_indirect_interactions(child_diffs, file_edits):
    indirect_authors = {}
    files_edited = []
    for difference in child_diffs:
        info = difference.split(":")
        if info[0] == 'dev/null':
            pass
        elif info[0] in file_edits:
            files_edited.append(info[0])
            for author in file_edits[info[0]].keys():
                if author in indirect_authors:
                    indirect_authors[author] += 1
                else:
                    indirect_authors[author] = 1
        else:
            files_edited.append(info[0])

    return indirect_authors, files_edited


def update_file_diffs(file_diffs, files_edited, child_author, init_time_val=5, deprecation_val=1):
    for file_object in files_edited:
        if file_object in file_diffs:
            file_diffs[file_object][child_author] = init_time_val
        else:
            file_diffs[file_object] = {child_author: init_time_val}
    for file_object in file_diffs:
        for author in file_diffs[file_object]:
            file_diffs[file_object][author] -= deprecation_val


def update_weight_values(weight, date, parent_author, child_author, actors, edge_tolerance=0.5):
    if parent_author not in actors[child_author]:
        actors.add_edge(parent_author, child_author, weights={date: weight}, weight=weight,
                        start=[date], end=[], current=True)
    else:
        if actors[child_author][parent_author]['current']:
            new_weight = actors[child_author][parent_author]['weight'] + weight
            actors[parent_author][child_author]['weights'][date] = new_weight
            actors[parent_author][child_author]['weight'] = new_weight
        else:
            if abs(weight) > edge_tolerance:
                actors[parent_author][child_author]['current'] = True
                actors[parent_author][child_author]['start'].append(date)
                new_weight = actors[child_author][parent_author]['weight'] + weight
                actors[parent_author][child_author]['weights'][date] = new_weight
                actors[parent_author][child_author]['weight'] = new_weight


def finalize_graph(end_date, actors):
    for edge in actors.edges():
        if len(actors[edge[0]][edge[1]]['start']) > len(actors[edge[0]][edge[1]]['end']):
            actors[edge[0]][edge[1]]['end'].append(end_date)
        if len(actors[edge[1]][edge[0]]['start']) > len(actors[edge[1]][edge[0]]['end']):
            actors[edge[1]][edge[0]]['end'].append(end_date)


def store_all_results_json(total_graph, health_values, commit_count, actor_count, closeness_values, repo):
    from networkx.readwrite import json_graph
    import json

    total_graph.graph['health'] = health_values
    total_graph.graph['commits'] = commit_count
    total_graph.graph['actors'] = actor_count
    total_graph.graph['closeness'] = closeness_values
    data = json_graph.node_link_data(total_graph)
    with open('./data/' + repo + ':actors', 'w') as f:
        json.dump(data, f)


if __name__ == '__main__':
    main()
