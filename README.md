# Chicago Inhouse League

### To-do List:
1. Add and complete necessary commands to host the inhouse league [ie) .startgame, .report, randomizing teams by mmr, etc)
2. Add a register button to login.jade. Modify login PUSH to accept registering new users. Check that username does not already exist in database. Might want to add some sort of email verification step and a password in order to make an account (that way we do not get spam accounts being made somehow and blowing up the database).
3. Make the login actually secure. I barebonesd everything and hacked it together but I imagine people have an incentive to find bugs to up their mmr.
4. Put it on Heroku.

##### Visual Stuff:
1. Fade out scroll bars when focus isn't on that part.
2. Change highlight color of message text.
3. Everything else.

### Changelog:

#9-17-2014
1. All bugs regarding creating/destroying/outing/submitting games should be fixed. There is a naive algorithm to assign teams and mmr gains/losses that can be improved on. 
2. Emails are now sent following successful registration using nodemailer [check package.json]. Passwords are stored and sent in plaintext which is bad.  
3. I added a quick button on the top navbar menu to help newusers out with commands. [ie) to join a game use .sign]
4. Attempted to use pm2 to provide automatic app restart on app failure but it will not install for me. 
5. Attempting to put on heroku. 

#### 9/06-2014 - Grant
I was having a bit of trouble with mongo and its large files sizes with git, for now we are ok but if the files grow any larger they will be greater than the 100mb limit github has.
The chatroom collection is now called newchatroom and is located at ./data. So to run mongod `sudo mongod --dbpath nodeCIHL/data`. For CLI mongod run mongo then use newchatroom then you can run your queries as usual. In the databaseinit file I put some helpful commands I used to simulate having 10 people in a lobby to test the report functions. 

Functions that are done: 
The user can now register,login, create a game, destroy a game, sign a game, out a game, start a game once there are 10 people in the lobby. The teams are assigned by MMR, the game will be played, the game can be reported, and the game will close once 6 people agree on a report. The mmr is then updated. 

Future things that need to be addressed
1. what happens if a person signs a game by accident/a game can not be reported? make set of admin only commands?
2. what happens if there is an error. we do not want the entire app to crash. do I use a bunch of try excepts or is there a higher level way.
3. standardizing what features we want. this will affect the database schema and some of the reporting functions. ie) right now I have a field for wins/losses but it is not updated
4. sending email verification to user. I know how to do this on a standard lamp server but not through heroku
5. more styling 
6. put it on heroku


#### 8/19/2014 - Grant
Added register functionality including simple error checking to avoid duplicating usernames or emailaddresses. Also modified the login.jade and register.jade views to include an error/success alert with a message depending on if the register proceeded correctly. 
In the future will need to either use ajax or better routing to take the user back to the register page without losing the inputted information when the user fails to register properly. 
A helpful tip when making new accounts: all the users start out with 3000 mmr by default so to delete all the new accounts you made just run db.chatroom.remove({mmr: 3000});

#### 8/15/2014 - Kevin
Added `cookie-session` module -- be sure to `npm install` it. Basically set up a session cookie when users log in; information can be accessed at `req.session.un` or `req.session.user`. Moved chat rendering from `user` controller to `chat` controller.

#### 8/13/2014 - Kevin
Haven't done that much, but spent some time reorganizing and cleaning up code. Most of the routing (`router.get` `router.post` etc.) should be handled within `server.js`, but I made a new `router.js` file, which then delegates to various other controllers. Right now, I've made:
* `home` -- don't worry about this one yet. It should be more pretty and link to an about page, instructions on joining, how it works, etc.
* `user` -- login, register, forgot password
* `chat` -- I don't actually know much about `socket.io` or chatrooms (I'll read about it later), but this should do all of that

I've left `index` there for the time being as well. I also think we should also have a `league` controller to contain functions about matching people together, creating games, rankings, etc., but we can integrate that with `chat` or whatever. But yeah, spent most of my time so far just refactoring stuff since I realized I can't just host a node server at work while slacking, so yeah. Also, you write a lott of comments lol -- it's a bit cluttering, so just try and let your code speak for itself (I would write documentation for each function but very little inline unless it's important). I can also make this site look nicer a bit later..
