#! /usr/bin/env python
__author__ = 'nathan'

import sys
import re
import requests
import getpass
import git
import shutil
import os
import time
import subprocess
import tempfile


from progressbar.widgets import Bar
from progressbar import ProgressBar
import networkx as nx
from collections import deque


def main():
    print_welcome()
    user, repo, command = parse_arguments(sys.argv)

    if command == 'r':
        create_new_record(repo, user)
    elif command == 'd':
        delete_records(repo)
    else:
        update_records(repo, user)


def print_welcome():
    print '\n', "*" * 80
    s = "* Welcome to the EEROS IQP Team Repository Analysis Tool"
    s += " " * (79 - len(s))
    s += "*"
    print s
    print "*" * 80, "\n"


def parse_arguments(arg_info):
    user = ""
    repo = ""
    command = ""

    usage_warning = ("Invalid Arguments!\n" + "Usage: ./GitParserRest.py u|rUser Repository-Name or \n" + " " * 7
                     + "./GitParserrest.py d Repository-Name\n")

    if len(arg_info) < 2:
        print usage_warning
        exit(1)
    else:
        command = arg_info[1]
        if command != 'u' and command != 'r' and command != 'd':
            print usage_warning
            exit(1)
        else:
            if command == 'r' or command == 'u':
                if len(arg_info) != 4:
                    print usage_warning
                    exit(1)
                user = arg_info[2]
                repo = arg_info[3]
            else:
                if len(arg_info) != 3:
                    print usage_warning
                    exit(1)
                repo = arg_info[2]

    return user, repo, command


def create_new_record(repo, user):
    print "Requesting all forks of the repository", repo, "hosted by", user
    username = raw_input("Please enter your Github username: ")
    password = getpass.getpass()
    auth_key = (username, password)
    forks = get_all_forks_from_repository(user, repo, auth_key)

    clone_urls = get_commit_urls(forks, user, repo)
    directory = clone_all_repositories(clone_urls)
    repositories = get_cloned_repositories(directory)

    commit_tree = create_commit_tree_structures_for_forks(repositories)

    update_with_diffs_from_clones(commit_tree)
    commit_tree = get_attributes_from_nodes(commit_tree)

    export_json(commit_tree, repo)
    # cleaning up
    print "Removing temporary files and cleaning up..."
    print
    shutil.rmtree(directory)


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


def clone_all_repositories(urls):
    clone_urls = []
    p = re.compile('(.*/{2})(.*\.com/[^/]+)(/[^/]+)(/[^/]+)(/[^/]+$)')
    for url in urls:
        clone_urls.append(p.sub('\g<1>github.com\g<3>\g<4>.git', url))
    temp_path = tempfile.mkdtemp(dir=os.getcwd())
    os.chdir(temp_path)
    progress = ProgressBar(widgets=['Cloning repositories', Bar()])
    for url in progress(clone_urls):
        os.chdir(tempfile.mkdtemp(dir=temp_path))
        git.Git().clone(url)
    os.chdir(temp_path)
    return temp_path


def get_cloned_repositories(directory):
    directories = os.listdir(directory)
    repositories = []
    progress = ProgressBar(widgets=['Getting Cloned Repository File Paths', Bar()])
    for directory in progress(directories):
        curr_directory = os.getcwd() + '/' + directory
        repo_name = os.listdir(curr_directory)[0]
        repositories.append(git.Repo(curr_directory + '/' + repo_name))
    return repositories


def create_commit_tree_structures_for_forks(repositories):

    progress = ProgressBar(widgets=['Creating commit history for forks', Bar()])
    tree = nx.DiGraph()
    root_index = -1
    for repository in progress(repositories):

        commits = []
        origin = repository.remote('origin')

        for branch in origin.refs:
            commits.append(branch.commit)

        for commit in commits:
            temp_root_index = update_tree(tree, commit, repository.git_dir)
            if root_index == -1 and temp_root_index != -1:
                root_index = temp_root_index

    tree.graph['root_index'] = root_index

    return tree


def update_tree(tree, root, repository_path):
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
                    tree.add_node(node, repo_path=repository_path)
                for parent in node.parents:
                    if parent not in tree:
                        tree.add_node(parent, repo_path=repository_path)
                    tree.add_edge(parent, node)
                    if parent not in visited:
                        queue.append(parent)
            else:
                if node in tree:
                    index = tree.nodes().index(node)
                else:
                    tree.add_node(node, repo_path=repository_path)
                    index = len(tree)
    return index


def update_with_diffs_from_clones(tree):
    progress = ProgressBar(widgets=['Processing Diff Information', Bar()], maxval=len(tree)).start()
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
            if progress.currval < len(tree):
                progress.update(progress.currval+1)
            for commit in tree[parent]:
                if commit not in visited:
                    queue.append(commit)
                    diff_result = ''
                    try:
                        if os.getcwd() != tree.node[commit]['repo_path']:
                            os.chdir(tree.node[commit]['repo_path'])
                        p = subprocess.Popen(["git", "diff", parent.hexsha, commit.hexsha], stdout=subprocess.PIPE)
                        diff_result = p.communicate()[0]
                        diff_result = diff_result.decode('utf8', 'ignore')
                        diff_result = process_diff(diff_result)
                    except UnicodeDecodeError as e:
                        print e
                        exit(1)

                    tree.node[commit]['diff'] = diff_result

    progress.finish()


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


def get_attributes_from_nodes(tree):
    progress = ProgressBar(widgets=['Parsing Commit Information', Bar()], maxval=len(tree) + len(tree.edges())).start()

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
        progress.update(progress.currval + 1)
    for edge in tree.edges():
        new_graph.add_edge(edge[0].hexsha, edge[1].hexsha)
        progress.update(progress.currval + 1)
    progress.finish()
    return new_graph


def parse_time(time_value):
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time_value)


def export_json(commit_tree, repo):
    from networkx.readwrite import json_graph
    import json
    data = json_graph.node_link_data(commit_tree)
    os.chdir(os.path.expanduser("~/eeros_iqp/eeros-community-analysis-website"))
    with open("./data/" + repo + ":commits", 'w') as f:
        json.dump(data, f)


def delete_records(repo):

    print "Deleting Old Records"
    file_name = './data/' + repo + ":commits"
    p = subprocess.Popen(['rm', file_name], stderr=subprocess.PIPE)
    if len(p.communicate()[1]) == 0:
        print "Finished deletion of Records!"
        print
    else:
        print "No Records exist for that repository!"
        print


def update_records(repo, user):
        if not os.path.exists(os.getcwd() + "data/" + repo + ":commits"):
            print "No Records exists for the specified repository! Run with r flag instead"
            print
            exit()

        print "Requesting all forks of the repository", repo, "hosted by", user
        username = raw_input("Please enter your Github username: ")
        password = getpass.getpass()
        auth_key = (username, password)
        forks = get_all_forks_from_repository(user, repo, auth_key)
        forks.append(u'https://api.github.com/repos/' + user + u'/' + repo + u'/forks')

        print "TBD"

        # get most recent commit for each branch and fork using neo4j
        # old_commits = get_commits_from_database(gdb, repo)

        # use rest api to check if most recent commit for branches and forks is more up to date
        #    if so grab most recent commits
        # updated_commits, changed = get_commits_from_forks(forks, old_commits, auth_key, user, repo)

        # if changed:
        #
        #     update_neo4j_with_care(updated_commits, gdb, repo+":commits", repo+":child")
        #
        #     print "Finished updating database!"
        #     print

        # else:
        #
        #     print "Repositories are up to date!"
        #     print


def get_commits_from_database(database, repository_name):
    # q = "match (node:`" + repository_name + ":commits`) return node"
    # commits = database.query(q, returns=client.Node)
    commit_dictionary = {}
    # for i in commits:
    #     commit_dictionary[i[0].properties['hexsha']] = i[0]
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




if __name__ == '__main__':
    main()