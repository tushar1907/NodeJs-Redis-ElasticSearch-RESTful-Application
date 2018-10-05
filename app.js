
const express = require('express');
const exphbs = require('express-handlebars');
const path = require('path');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const redis = require('redis');
var Validator = require('jsonschema').Validator;
const uuid = require('uuid');
var v = new Validator();

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


//Search Page
app.get('/user/:id', (req, res, next) => {
    console.log(req.params.id)
        client.get(req.params.id,(err, reply)=>{
            console.log("Reply : " + reply);
            console.log("error : " + err);
            if (err) res.json(err);
            else res.json(reply);
        });
});

app.post('/user/search', function (req, res, next) {    
    let id = req.body.id;

    client.hgetall(id, (err, obj) => {
        if (!obj) {
            res.render('searchusers', {
                error: 'User does no exist'
            })
        }
        else {
            obj.id = id
            res.status(200).send({
                "obj": obj
            })
        }
    });
});

app.post('/user/add', (req, res, next) => {
    console.log(v.validate(req.body, schema).errors);
    if (v.validate(req.body, schema).errors.length == 0) {
        const uuidSave = uuid();
        console.log(uuidSave);
        client.set(uuidSave, JSON.stringify(req.body), function (err, reply) {
            console.log("Reply : " + reply);
            console.log("Reply : " + err);
            if (err) res.send(err);
            else res.send(reply);
        });
    }
})

app.delete('/user/:id',(req,res,next)=>{
    console.log(req.params.id)
        client.del(req.params.id,(err, reply)=>{
            console.log("Reply : " + reply);
            console.log("error : " + err);
            if (err) res.json(err);
            else res.json(reply);
        })
})

app.put('/user/:id',(req,res,next)=>{
    let id = req.params.id;
    console.log(id)
    console.log(req.body)
    client.get(id, (err, obj) => {
        console.log(obj)
        if (!obj) {
            res.status(500).send({ "error": err})
        }
        else {
            client.set(id, JSON.stringify(req.body), function (err, reply) {
                console.log("Reply : " + reply);
                console.log("Reply : " + err);
                if (err) res.send(err);
                else res.send(reply);
            });
        }
    });
})


app.listen(port, () => {
    console.log("Server started at " + port);
})


const schema = {
    "definitions": {},
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$id": "http://example.com/root.json",
    "type": "object",
    "title": "The Root Schema",
    "description": "An explanation about the purpose of this instance.",
    "readOnly": true,
    "writeOnly": false,
    "properties": {
        "checked": {
            "$id": "#/properties/checked",
            "type": "boolean",
            "title": "The Checked Schema",
            "description": "An explanation about the purpose of this instance.",
            "default": false,
            "examples": [
                false
            ],
            "readOnly": true,
            "writeOnly": false
        },
        "dimensions": {
            "$id": "#/properties/dimensions",
            "type": "object",
            "title": "The Dimensions Schema",
            "description": "An explanation about the purpose of this instance.",
            "readOnly": true,
            "writeOnly": false,
            "properties": {
                "width": {
                    "$id": "#/properties/dimensions/properties/width",
                    "type": "integer",
                    "title": "The Width Schema",
                    "description": "An explanation about the purpose of this instance.",
                    "default": 0,
                    "examples": [
                        5
                    ],
                    "readOnly": true,
                    "writeOnly": false
                },
                "height": {
                    "$id": "#/properties/dimensions/properties/height",
                    "type": "integer",
                    "title": "The Height Schema",
                    "description": "An explanation about the purpose of this instance.",
                    "default": 0,
                    "examples": [
                        10
                    ],
                    "readOnly": true,
                    "writeOnly": false
                }
            }
        },
        "id": {
            "$id": "#/properties/id",
            "type": "integer",
            "title": "The Id Schema",
            "description": "An explanation about the purpose of this instance.",
            "default": 0,
            "examples": [
                1
            ],
            "readOnly": true,
            "writeOnly": false
        },
        "name": {
            "$id": "#/properties/name",
            "type": "string",
            "title": "The Name Schema",
            "description": "An explanation about the purpose of this instance.",
            "default": "",
            "examples": [
                "A green door"
            ],
            "readOnly": true,
            "writeOnly": false,
            "pattern": "^(.*)$"
        },
        "price": {
            "$id": "#/properties/price",
            "type": "number",
            "title": "The Price Schema",
            "description": "An explanation about the purpose of this instance.",
            "default": 0.0,
            "examples": [
                12.5
            ],
            "readOnly": true,
            "writeOnly": false
        },
        "tags": {
            "$id": "#/properties/tags",
            "type": "array",
            "title": "The Tags Schema",
            "description": "An explanation about the purpose of this instance.",
            "readOnly": true,
            "writeOnly": false,
            "items": {
                "$id": "#/properties/tags/items",
                "type": "string",
                "title": "The Items Schema",
                "description": "An explanation about the purpose of this instance.",
                "default": "",
                "examples": [
                    "home",
                    "green"
                ],
                "readOnly": true,
                "writeOnly": false,
                "pattern": "^(.*)$"
            }
        }
    }
}