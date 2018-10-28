const router = require('express').Router();

const passport = require('passport');

//auth login
router.get('/google',passport.authenticate('google',{
    scope:['profile']
}))

router.get('/google/redirect',passport.authenticate('google'),(req,res)=>{
    res.send({
        "MSG": "This is a successfull redirect"
    })
})
module.exports = router;