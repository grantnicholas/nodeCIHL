# Chicago Inhouse League

### To-do List:
1. Add and complete necessary commands to host the inhouse league [ie) .startgame, .report, randomizing teams by mmr, etc)
2. Add a register button to login.jade. Modify login PUSH to accept registering new users. Check that username does not already exist in database. Might want to add some sort of email verification step and a password in order to make an account (that way we do not get spam accounts being made somehow and blowing up the database).
3. Make the login actually secure. I barebonesd everything and hacked it together but I imagine people have an incentive to find bugs to up their mmr.
4. Put it on Heroku.

### Changelog:

#### 8/15/2014 - Kevin
Added `cookie-session` module -- be sure to `npm install` it. Basically set up a session cookie when users log in; information can be accessed at `req.session.un` or `req.session.user`. Moved chat rendering from `user` controller to `chat` controller.

#### 8/13/2014 - Kevin
Haven't done that much, but spent some time reorganizing and cleaning up code. Most of the routing (`router.get` `router.post` etc.) should be handled within `server.js`, but I made a new `router.js` file, which then delegates to various other controllers. Right now, I've made:
* `home` -- don't worry about this one yet. It should be more pretty and link to an about page, instructions on joining, how it works, etc.
* `user` -- login, register, forgot password
* `chat` -- I don't actually know much about `socket.io` or chatrooms (I'll read about it later), but this should do all of that

I've left `index` there for the time being as well. I also think we should also have a `league` controller to contain functions about matching people together, creating games, rankings, etc., but we can integrate that with `chat` or whatever. But yeah, spent most of my time so far just refactoring stuff since I realized I can't just host a node server at work while slacking, so yeah. Also, you write a lott of comments lol -- it's a bit cluttering, so just try and let your code speak for itself (I would write documentation for each function but very little inline unless it's important). I can also make this site look nicer a bit later..
