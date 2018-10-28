const router = require('express').Router();

//auth login
router.get('/google',(req,res)=>{
    res.send({'message':"Login with Google stared !"})
})

module.exports = router;