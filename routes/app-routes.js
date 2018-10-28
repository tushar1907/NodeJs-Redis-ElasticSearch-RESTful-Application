const router = require('express').Router();

const passport = require('passport');

//auth login
router.get('/google/redirect',passport.authenticate('google',{
    scope:['profile']
}))

module.exports = router;