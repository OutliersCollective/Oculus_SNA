# -*- coding: utf-8 -*-

__author__ = 'oscar@outliers.es'

# Twitter lib used for user lookup + streaming: https://github.com/sixohsix/twitter [easy_install twitter]

from tweepy.streaming import StreamListener
from tweepy import OAuthHandler
from tweepy import Stream
import pprint
import json
import traceback
import shutil


# Go to http://dev.twitter.com and create an app.
# The consumer key and secret will be generated for you after

consumer_key = YOUR_CONSUMER_KEY
consumer_secret = YOUR_CONSUMER_SECRET

# After the step above, you will be redirected to your app's page.
# Create an access token under the the "Your access token" section

access_token = YOUR_ACCESS_TOKEN
access_token_secret = YOUR_TOKEN_SECRET

TMP_FILE = "network.tmp.json"

DEF_FILE = "network.json"


nodes = []
links = []
nodes_dict = {}
links_dict = {}


# Persist the network into a d3 force layout consumible json

def persist_network():

    with open(TMP_FILE, "wb") as file_out:
        json.dump({'nodes': nodes, 'links': links}, file_out)

    shutil.move(TMP_FILE, DEF_FILE)


# Inserts a tweet into the network structure

def insert_tweet_in_network(tweet):

    # Get source and target

    source_user = tweet['retweeted_status']['user']['screen_name']
    source_followers = tweet['retweeted_status']['user']['followers_count']
    target_user = tweet['user']['screen_name']
    target_followers = tweet['user']['followers_count']

    print "INSERTING edge from %s w/ follower count %d to %s w/ follower count %d" \
          % (source_user, source_followers, target_user, target_followers)

    # Insert nodes if they do not exist

    if source_user not in nodes_dict:
        nodes_dict[source_user] = len(nodes)
        nodes.append({'user': source_user, 'followers': source_followers})

    if target_user not in nodes_dict:
        nodes_dict[target_user] = len(nodes)
        nodes.append({'user': target_user, 'followers': target_followers})

    # Insert links if they do not exist

    link_name = source_user + "->" + target_user

    if link_name not in links_dict:
        links_dict[link_name] = len(links)
        links.append({'source': nodes_dict[source_user], 'target': nodes_dict[target_user], 'value': 0})

    # Increment 'value' content for the link

    links[links_dict[link_name]]['value'] += 1

    persist_network()


class MyListener(StreamListener):
    """ Listener that calls insert_tweet_in_network if a retweet comes by
    """
    def on_data(self, data):

        tweet = json.loads(data)

        try:
            if 'retweeted_status' in tweet:
                insert_tweet_in_network(tweet)
        except:
            print "*UNEXPECTED ERROR, TRACE DUMP HERE:*"
            traceback.print_exc()

        return True

    def on_error(self, status):
        print status

# Authenticate

auth = OAuthHandler(consumer_key, consumer_secret)
auth.set_access_token(access_token, access_token_secret)

# ...and start streaming

stream = Stream(auth, MyListener())
stream.filter(track=["iphone"])
