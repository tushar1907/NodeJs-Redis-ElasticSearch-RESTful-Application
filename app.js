
const express = require('express');
const exphbs = require('express-handlebars');
const path = require('path');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const redis = require('redis');
var Validator = require('jsonschema').Validator;
const uuid = require('uuid');
var v = new Validator();
const authRoutes = require('./routes/app-routes');
const passportSetup = require('./config/passport-setup')
const jwt = require('jsonwebtoken');
const schema = require('./schema');


let client = redis.createClient();

client.on('connect', () => {
    console.log("Connected to redis");
});


//Set Port
const port = 3000;

//Set app
const app = express();

//Set View Engine
app.engine('handlebars', exphbs({ defaultLayout: 'main' }));
app.set('view engine', 'handlebars');

//body-Parser
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }));

//mwthodOverride
app.use(methodOverride('method'));

//Set routes
app.use('/auth', authRoutes);

app.get('/', (req, res) => {

})



//token generation
app.post('/api/login', (req, res) => {
    //auth user
    const token = jwt.sign({
        exp: Math.floor(Date.now() / 1000) + (60*5)        
    }, "my_secret_key");

    res.send({
        token: token
    })

})

//Search Page
app.get('/plan/:id', ensureToken, (req, res, next) => {
    jwt.verify(req.token, 'my_secret_key', (err, data) => {
        if (err) {
            res.sendStatus(403)
        }
        else {           
            client.get(req.params.id, (err, reply) => {                
                if (err) res.json(err);
                else res.json(reply);
            });
        }
    })
});
function ensureToken(req, res, next) {
    const bearerHeader = req.headers["authorization"];
    if (typeof bearerHeader !== 'undefined') {
        const bearer = bearerHeader.split(" ");
        const bearerToken = bearer[1];
        req.token = bearerToken;
        next();
    } else {
        res.sendStatus(403);
    }
}

app.post('/plan', (req, res, next) => {
    console.log(v.validate(req.body, schema));
    if (v.validate(req.body, schema).errors.length == 0) {
        const uuidSave = uuid();
        console.log(uuidSave);
        client.set(uuidSave, JSON.stringify(req.body), function (err, reply) {
            console.log("Reply : " + reply);
            console.log("Error : " + err);
            if (err) res.send(err);
            else res.send({ "reply": reply, "result": "Result successfully posted" });;
        });
    }
    else {
        res.send({
            "error": "Jason is not validated with schema"
        })
    }
})

app.delete('/plan/:id', (req, res, next) => {
    console.log(req.params.id)
    client.del(req.params.id, (err, reply) => {
        console.log("Reply : " + reply);
        console.log("Error : " + err);
        if (err) res.send(err);
        else res.send({ "reply": reply, "result": "Result successfully deleted" });;
    })
})

app.put('/plan/:id', (req, res, next) => {
    let id = req.params.id;
    console.log(id)
    console.log(req.body)
    client.get(id, (err, obj) => {
        console.log(obj)
        if (!obj) {
            res.status(500).send({ "error": err })
        }
        else {
            if (v.validate(req.body, schema).errors.length == 0) {
                client.set(id, JSON.stringify(req.body), function (err, reply) {
                    console.log("Reply : " + reply);
                    console.log("Error : " + err);
                    if (err) res.send(err);
                    else res.send({ "reply": reply, "result": "Result successfully updated" });
                });
            }
            else {
                res.send({
                    "error": "Json is not validated with schema"
                })
            }
        }
    });
})


app.listen(port, () => {
    console.log("Server started at " + port);
})