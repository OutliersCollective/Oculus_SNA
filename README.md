Oculus_SNA
==========

Please note that code in sna_aux.js is heavily based on this project [https://github.com/cemrich/early-webvr-demo
](https://github.com/cemrich/early-webvr-demo
). We'd like to thank the author and also Vladimir Vukićević for their beautiful work.


Running the demo
================

For this demo to run on your browser:

1. Create a twitter app following the steps in acq/get_data.py first comments, and substitute the uppercase variables with those provided by Twitter
2. Run the acq/get_data.py script to start gathering data [you will need to install https://github.com/sixohsix/twitter with easy_install twitter or pip install twitter]. You should see some logging information on the screen and a constant update of acq/network.json
3. If for some reason steps 1+2 do not work or you want to start viewing some networks without extra effort, there are two example files (network.static.json + network.static.big.json) you can visualize off-the-sheld. Just change line 84 on sna_main.js and point it to the right file
4. Download a WebVR-compatible browser, either Chromium (http://blog.tojicode.com/2014/07/bringing-vr-to-chrome.html) or Firefox (http://blog.bitops.com/blog/2014/06/26/first-steps-for-vr-on-the-web/)
5. Connect your Oculus Rift to your computer
6. Open www/index.html on a browser downloaded in step 4. *PLEASE NOTE THAT 'www' and 'acq' directory should be served by a web server, because local JSON files are considered a vulnerability. You can use MAMP, python -m SimpleHTTPServer, or something similar*
7. You should now see a 'left+right eye' rendering on your browser. Just press the 'Toggle Fullscreen VR(f)' button, put your Oculus Rift on, and enjoy!

Further reading
===============

WebVR

http://blog.tojicode.com/2014/07/bringing-vr-to-chrome.html
http://blog.bitops.com/blog/2014/06/26/first-steps-for-vr-on-the-web/

Oculus Development

http://www.manning.com/bdavis/

http://www.reddit.com/r/oculus/

http://www.reddit.com/r/oculus/comments/1byh3f/the_oculus_rift_reading_list/
