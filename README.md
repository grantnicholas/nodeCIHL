Hey Kevin. Sorry for the shitty design. First nodejs/express webapp I've made so it was a learning process. 

Let me know if you have any questions. 

The things that need to be implemented are:

1. Add and complete necessary commands to host the inhouse league [ie) .startgame, .report, randomizing teams by mmr, etc)
2. Add a register button to login.jade. Modify login PUSH to accept registering new users. Check that username does not already exist in database. Might want to add some sort of email verification step and a password in order to make an account (that way we do not get spam accounts being made somehow and blowing up the database). 
3. Make the login actually secure. I barebonesd everything and hacked it together but I imagine people have an incentive to find bugs to up their mmr.
4. Put it on Heroku. 

I'm sure there is other stuff but for now that is a good start. 

express
body-parser
mongodb
socket.io
monk
morgan
cookie-parser
jade