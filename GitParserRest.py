#! /usr/bin/env python
__author__ = 'nathan'

import sys
import re
import requests
import getpass
import git
import tempfile
import shutil
import os
import time

from neo4jrestclient.client import GraphDatabase
import neo4jrestclient.client as client
from neo4jrestclient.exceptions import NotFoundError
from requests.exceptions import ConnectionError
from progressbar.widgets import Bar
from progressbar import ProgressBar
import networkx as nx
from collections import deque


def clone_all_repositories(urls):
    clone_urls = []
    p = re.compile('(.*/{2})(.*\.com/[^/]+)(/[^/]+)(/[^/]+)(/[^/]+$)')
    for url in urls:
        clone_urls.append(p.sub('\g<1>github.com\g<3>\g<4>.git', url))
    temp_path = tempfile.mkdtemp()
    os.chdir(temp_path)
    progress = ProgressBar(widgets=['Cloning repositories', Bar()])
    for url in progress(clone_urls):
        os.chdir(tempfile.mkdtemp(dir=temp_path))
        git.Git().clone(url)
    os.chdir(temp_path)
    return temp_path


def get_all_forks_from_repository(user, repository_name, auth_key):
    urls = []
    url = 'https://api.github.com/repos/' + user + '/' + repository_name + '/forks'
    try:
        r = requests.get(url,
                         auth=auth_key).json()
        urls = [i[u'forks_url'] for i in r]
    except (KeyError, TypeError):
        print "Invalid Password!"
        exit(1)
    return urls


def get_commit_urls(forks, user, repository_name):
    repos = [u'https://api.github.com/repos/' + user + u'/' + repository_name + u'/commits']
    p = re.compile('(\S+/{2})(\S+/)')
    progress = ProgressBar(widgets=['Creating Clone Urls', Bar()])

    if len(forks) > 0:
        for fork in progress(forks):
            matches = p.findall(fork)[0]
            repos.append(matches[0] + matches[1] + 'commits')
    else:
        progress.start()
        progress.finish()
    return repos


def get_cloned_repositories(directory):
    directories = os.listdir(directory)
    repositories = []
    progress = ProgressBar(widgets=['Getting Cloned Repository File Paths', Bar()])
    for directory in progress(directories):
        curr_directory = os.getcwd() + '/' + directory
        repo_name = os.listdir(curr_directory)[0]
        repositories.append(git.Repo(curr_directory + '/' + repo_name))
    return repositories


def create_tree_recursively(tree, root):

    queue = deque()
    queue.append(root)
    visited = set([])
    index = -1
    while len(queue) != 0:
        node = queue.popleft()
        if node not in visited:
            visited.add(node)
            if len(node.parents) != 0:
                if node not in tree:
                    tree.add_node(node)
                for parent in node.parents:
                    tree.add_edge(parent, node)
                    if parent not in visited:
                        queue.append(parent)
            else:
                if node in tree:
                    index = tree.nodes().index(node)
                else:
                    tree.add_node(node)
                    index = len(tree)
    return index


def create_commit_tree_structures_for_forks(repositories):

    trees = []
    progress = ProgressBar(widgets=['Creating commit history for forks', Bar()])
    for repository in progress(repositories):
        tree = nx.DiGraph()

        commits = []
        origin = repository.remote('origin')

        for branch in origin.refs:
            commits.append(branch.commit)

        root_index = -1
        for commit in commits:
            root_index = create_tree_recursively(tree, commit)

        tree.graph['repository_path'] = repository.git_dir
        tree.graph['root_index'] = root_index

        trees.append(tree)
    return trees


def update_with_diffs_from_clones(trees):
    max_val = 0
    for tree in trees:
        max_val += len(tree)
    progress = ProgressBar(widgets=['Processing Diff Information', Bar()], maxval=max_val).start()
    for tree in trees:
        git_handle = git.Git(tree.graph['repository_path'])
        root_index = tree.graph['root_index']
        queue = deque()
        parent = tree.nodes()[root_index]
        tree.node[parent]['diff'] = ''
        queue.append(parent)
        visited = set()
        while len(queue) > 0:
            parent = queue.popleft()
            if parent not in visited:
                visited.add(parent)
                if progress.currval < max_val:
                    progress.update(progress.currval+1)
                for commit in tree[parent]:
                    if commit not in visited:
                        queue.append(commit)
                        diff_result = ""
                        try:
                            diff_result = git_handle.diff(parent.hexsha, commit.hexsha)
                        except UnicodeDecodeError:
                            print parent.hexsha, commit.hexsha

                        tree.node[commit]['diff'] = diff_result

    progress.finish()


def get_attributes_from_nodes(trees):
    progress = ProgressBar(widgets=['Parsing Commit Information', Bar()])
    new_trees = []
    for tree in progress(trees):
        new_graph = nx.DiGraph()
        for node in tree.nodes():
            diff = ''
            if 'diff' in tree.node[node]:
                diff = tree.node[node]['diff']

            committed_date = node.committed_date
            time.timezone = int(node.committer_tz_offset)
            committed_date = time.gmtime(committed_date)

            authored_date = node.authored_date
            time.timezone = int(node.author_tz_offset)
            authored_date = time.gmtime(authored_date)

            attributes = dict(authored_date=parse_time(committed_date), author=node.author.email,
                              committer=node.committer.email, committed_date=parse_time(authored_date),
                              message=node.message, diff=diff, hexsha=node.hexsha)
            new_graph.add_node(node.hexsha, **attributes)
        for edge in tree.edges():
            new_graph.add_edge(edge[0].hexsha, edge[1].hexsha)
        new_trees.append(new_graph)
    return new_trees


def parse_time(time_value):
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time_value)


def merge_trees(trees):
    if len(trees) > 1:
        return nx.compose_all(trees)
    else:
        return trees[0]


def get_commits_from_database(database, repository_name):
    q = "match (node:`" + repository_name + ":commits`) return node"
    commits = database.query(q, returns=client.Node)
    commit_dictionary = {}
    for i in commits:
        commit_dictionary[i[0].properties['hexsha']] = i[0]
    return commit_dictionary


# TODO remove parents from attributes before returning
def get_commits_from_forks(forks, old_commits, auth_key, user, repo):
    new_commits = []
    graphs = []
    for fork in forks:
        graph = nx.DiGraph()
        branch_request_url = fork[:-5] + "git/refs/heads"
        commit_request_url = fork[:-5] + "git/commits"
        branches = requests.get(branch_request_url, auth=auth_key)
        for branch in branches.json():
            if branch[u'object'][u'sha'] not in old_commits:
                new_commits.append(branch[u'object'][u'sha'])

        diff_url_base = 'http://github.com/' + user + '/' + repo + '/commit/'
        for commit in new_commits:
            queue = deque()
            queue.append(commit)
            while len(queue) > 0:
                to_examine = queue.popleft()
                request_url = commit_request_url + '/' + to_examine
                commit_info = requests.get(request_url, auth=auth_key).json()
                parents = commit_info['parents']
                for parent in parents:
                    if parent['sha'] not in old_commits:
                        queue.append(parent['sha'])

                attributes = dict(authored_date=commit_info['author']['date'], author=commit_info['author']['email'],
                                  committer=commit_info['committer']['email'],
                                  committed_date=commit_info['committer']['date'], message=commit_info['message'],
                                  hexsha=to_examine, parents=[i['sha'] for i in parents])

                diff_file = requests.get(diff_url_base + to_examine + ".diff").text
                attributes['diff'] = diff_file
                graph.add_node(attributes['hexsha'], **attributes)
        for node in graph.nodes():
            for parent in graph.node[node]['parents']:
                graph.add_edge(parent, node)
        graphs.append(graph)
    if len(new_commits) == 0:
        return None, False
    else:
        if len(graphs) > 1:
            return nx.compose_all(graphs), True
        else:
            return graphs[0], True


def update_neo4j_with_care(graph, database, commit_label, edge_label):
    max_val = len(graph) + len(graph.edges())
    progress = ProgressBar(widgets=['Uploading New Commits to the Database', Bar()], maxval=max_val).start()
    nodes = []
    nodes_lookup = {}
    for i in graph.nodes():
        if len(graph.node[i]) > 0:
            nodes.append(database.nodes.create(**graph.node[i]))
            nodes_lookup[i] = nodes[-1]
        else:
            q = "match (node:`" + commit_label + "` {hexsha:'" + i + "'}) return node"
            node_object = database.query(q, returns=client.Node)[0][0]
            nodes_lookup[i] = node_object
        progress.update(progress.currval+1)
    for i in graph.edges():
        if i[1] in graph[i[0]]:
            nodes_lookup[i[0]].relationships.create(edge_label, nodes_lookup[i[1]], **graph[i[0]][i[1]])
        if i[0] in graph[i[1]]:
            nodes_lookup[i[1]].relationships.create(edge_label, nodes_lookup[i[0]], **graph[i[1]][i[0]])
        progress.update(progress.currval+1)
    label = database.labels.create(commit_label)
    label.add(*nodes)
    progress.finish()


def export_json(commit_tree, repo):
    from networkx.readwrite import json_graph
    import json
    data = json_graph.node_link_data(commit_tree)
    os.chdir(os.path.expanduser("~/eeros_iqp/eeros-community-analysis-website"))
    with open("./data/" + repo + ":commits", 'w') as f:
        json.dump(data, f)


def main():
    print '\n', "*" * 80
    s = "* Welcome to the EEROS IQP Team Repository Analysis Tool"
    s += " " * (79 - len(s))
    s += "*"
    print s
    print "*" * 80, "\n"
    if len(sys.argv) != 4:
        print "Invalid Arguments!"
        print "Usage: ./GitParserRest u|r User Repository-Name"
        exit(1)
    command = sys.argv[1]
    if command != 'u' and command != 'r' and command != 'd':
        print "Invalid Arguments!"
        print "Usage: ./GitParserRest u|r|d User Repository-Name"
        exit(1)
    user = sys.argv[2]
    repo = sys.argv[3]

    if command == 'r':

        # print "Deleting Old Records"
        # node_label = ":`" + repo + ":commits`"
        # gdb.query("match (node" + node_label + ") optional match (node)-[relationship]-() delete node, relationship")

        # Get forks
        print "Requesting all forks of the repository", repo, "hosted by", user
        username = raw_input("Please enter your Github username: ")
        password = getpass.getpass()
        auth_key = (username, password)
        forks = get_all_forks_from_repository(user, repo, auth_key)

        # Clone directories and grab file paths
        clone_urls = get_commit_urls(forks, user, repo)
        directory = clone_all_repositories(clone_urls)
        repositories = get_cloned_repositories(directory)

        # create tree structure from all commits
        commit_trees = create_commit_tree_structures_for_forks(repositories)

        # get diff data from all commits and update tree
        update_with_diffs_from_clones(commit_trees)
        commit_trees = get_attributes_from_nodes(commit_trees)

        # merge all trees from forks into one big commit mess
        master_tree = merge_trees(commit_trees)

        # store all data in neo4j
        # Converter.to_neo_4j(master_tree, gdb, repo+":commits", repo+":child")
        export_json(master_tree, repo)
        # cleaning up
        print "Removing temporary files and cleaning up..."
        print
        shutil.rmtree(directory)

    elif command == 'd':

        print "Connecting to the database..."
        gdb = None
        try:
            gdb = GraphDatabase("http://localhost:7474/db/data", username='neo4j', password='eeros')
        except ConnectionError:
            print "Connection to database failed!"
            exit(1)
        except NotFoundError:
            print "Can't find specified database!"
            exit(1)

        print "Deleting Old Records"
        node_label = ":`" + repo + ":commits`"
        gdb.query("match (node" + node_label + ") optional match (node)-[relationship]-() delete node, relationship")
        print "Finished deletion of Records!"
        print

    else:

        print "Connecting to the database..."
        gdb = None
        try:
            gdb = GraphDatabase("http://localhost:7474/db/data", username='neo4j', password='eeros')
        except ConnectionError:
            print "Connection to database failed!"
            exit(1)
        except NotFoundError:
            print "Can't find specified database!"
            exit(1)

        print "Requesting all forks of the repository", repo, "hosted by", user
        username = raw_input("Please enter your Github username: ")
        password = getpass.getpass()
        auth_key = (username, password)
        forks = get_all_forks_from_repository(user, repo, auth_key)
        forks.append(u'https://api.github.com/repos/' + user + u'/' + repo + u'/forks')

        # get most recent commit for each branch and fork using neo4j
        old_commits = get_commits_from_database(gdb, repo)

        # use rest api to check if most recent commit for branches and forks is more up to date
        #    if so grab most recent commits
        updated_commits, changed = get_commits_from_forks(forks, old_commits, auth_key, user, repo)

        if changed:

            update_neo4j_with_care(updated_commits, gdb, repo+":commits", repo+":child")

            print "Finished updating database!"
            print

        else:

            print "Repositories are up to date!"
            print


if __name__ == '__main__':
    main()