
const express = require('express');
const exphbs = require('express-handlebars');
const path = require('path');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const redis = require('redis');
var Validator = require('jsonschema').Validator;
const uuid = require('uuid');
// const schema = require('schema.js');
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
    client.get(req.params.id, (err, reply) => {
        console.log("Reply : " + reply);
        console.log("Error : " + err);
        if (err) res.json(err);
        else res.json(reply);
    });
});

app.post('/plan', (req, res, next) => {
    console.log(v.validate(req.body, schema));
    if (v.validate(req.body, schema).errors.length == 0) {
        const uuidSave = uuid();
        console.log(uuidSave);
        client.set(uuidSave, JSON.stringify(req.body), function (err, reply) {
            console.log("Reply : " + reply);
            console.log("Error : " + err);
            if (err) res.send(err);
            else res.send(reply);
        });
    }
    else{
        res.send({
            "error":"Jason is not validated with schema"
        })
    }
})

app.delete('/user/:id', (req, res, next) => {
    console.log(req.params.id)
    client.del(req.params.id, (err, reply) => {
        console.log("Reply : " + reply);
        console.log("Error : " + err);
        if (err) res.json(err);
        else res.json(reply);
    })
})

app.put('/user/:id', (req, res, next) => {
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
                    else res.send(reply);
                });
            }
            else{
                res.send({
                    "error":"Json is not validated with schema"
                })
            }
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
        "required": [
        "planCostShares",
        "linkedPlanServices",
        "_org",
        "objectId",
        "objectType",
        "planType",
        "creationDate"
        ],
        "properties": {
        "planCostShares": {
            "$id": "#/properties/planCostShares",
            "type": "object",
            "title": "The Plancostshares Schema",
            "required": [
            "deductible",
            "_org",
            "copay",
            "objectId",
            "objectType"
            ],
            "properties": {
            "deductible": {
                "$id": "#/properties/planCostShares/properties/deductible",
                "type": "integer",
                "title": "The Deductible Schema",
                "default": 0,
                "examples": [
                2000
                ]
            },
            "_org": {
                "$id": "#/properties/planCostShares/properties/_org",
                "type": "string",
                "title": "The _org Schema",
                "default": "",
                "examples": [
                "example.com"
                ],
                "pattern": "^(.*)$"
            },
            "copay": {
                "$id": "#/properties/planCostShares/properties/copay",
                "type": "integer",
                "title": "The Copay Schema",
                "default": 0,
                "examples": [
                10
                ]
            },
            "objectId": {
                "$id": "#/properties/planCostShares/properties/objectId",
                "type": "string",
                "title": "The Objectid Schema",
                "default": "",
                "examples": [
                "1234vxc2324sdf"
                ],
                "pattern": "^(.*)$"
            },
            "objectType": {
                "$id": "#/properties/planCostShares/properties/objectType",
                "type": "string",
                "title": "The Objecttype Schema",
                "default": "",
                "examples": [
                "membercostshare"
                ],
                "pattern": "^(.*)$"
            }
            }
        },
        "linkedPlanServices": {
            "$id": "#/properties/linkedPlanServices",
            "type": "array",
            "title": "The Linkedplanservices Schema",
            "items": {
            "$id": "#/properties/linkedPlanServices/items",
            "type": "object",
            "title": "The Items Schema",
            "required": [
                "linkedService",
                "planserviceCostShares",
                "_org",
                "objectId",
                "objectType"
            ],
            "properties": {
                "linkedService": {
                "$id": "#/properties/linkedPlanServices/items/properties/linkedService",
                "type": "object",
                "title": "The Linkedservice Schema",
                "required": [
                    "_org",
                    "objectId",
                    "objectType",
                    "name"
                ],
                "properties": {
                    "_org": {
                    "$id": "#/properties/linkedPlanServices/items/properties/linkedService/properties/_org",
                    "type": "string",
                    "title": "The _org Schema",
                    "default": "",
                    "examples": [
                        "example.com"
                    ],
                    "pattern": "^(.*)$"
                    },
                    "objectId": {
                    "$id": "#/properties/linkedPlanServices/items/properties/linkedService/properties/objectId",
                    "type": "string",
                    "title": "The Objectid Schema",
                    "default": "",
                    "examples": [
                        "1234520xvc30asdf"
                    ],
                    "pattern": "^(.*)$"
                    },
                    "objectType": {
                    "$id": "#/properties/linkedPlanServices/items/properties/linkedService/properties/objectType",
                    "type": "string",
                    "title": "The Objecttype Schema",
                    "default": "",
                    "examples": [
                        "service"
                    ],
                    "pattern": "^(.*)$"
                    },
                    "name": {
                    "$id": "#/properties/linkedPlanServices/items/properties/linkedService/properties/name",
                    "type": "string",
                    "title": "The Name Schema",
                    "default": "",
                    "examples": [
                        "Yearly physical"
                    ],
                    "pattern": "^(.*)$"
                    }
                }
                },
                "planserviceCostShares": {
                "$id": "#/properties/linkedPlanServices/items/properties/planserviceCostShares",
                "type": "object",
                "title": "The Planservicecostshares Schema",
                "required": [
                    "deductible",
                    "_org",
                    "copay",
                    "objectId",
                    "objectType"
                ],
                "properties": {
                    "deductible": {
                    "$id": "#/properties/linkedPlanServices/items/properties/planserviceCostShares/properties/deductible",
                    "type": "integer",
                    "title": "The Deductible Schema",
                    "default": 0,
                    "examples": [
                        10
                    ]
                    },
                    "_org": {
                    "$id": "#/properties/linkedPlanServices/items/properties/planserviceCostShares/properties/_org",
                    "type": "string",
                    "title": "The _org Schema",
                    "default": "",
                    "examples": [
                        "example.com"
                    ],
                    "pattern": "^(.*)$"
                    },
                    "copay": {
                    "$id": "#/properties/linkedPlanServices/items/properties/planserviceCostShares/properties/copay",
                    "type": "integer",
                    "title": "The Copay Schema",
                    "default": 0,
                    "examples": [
                        175
                    ]
                    },
                    "objectId": {
                    "$id": "#/properties/linkedPlanServices/items/properties/planserviceCostShares/properties/objectId",
                    "type": "string",
                    "title": "The Objectid Schema",
                    "default": "",
                    "examples": [
                        "1234512xvc1314asdfs"
                    ],
                    "pattern": "^(.*)$"
                    },
                    "objectType": {
                    "$id": "#/properties/linkedPlanServices/items/properties/planserviceCostShares/properties/objectType",
                    "type": "string",
                    "title": "The Objecttype Schema",
                    "default": "",
                    "examples": [
                        "membercostshare"
                    ],
                    "pattern": "^(.*)$"
                    }
                }
                },
                "_org": {
                "$id": "#/properties/linkedPlanServices/items/properties/_org",
                "type": "string",
                "title": "The _org Schema",
                "default": "",
                "examples": [
                    "example.com"
                ],
                "pattern": "^(.*)$"
                },
                "objectId": {
                "$id": "#/properties/linkedPlanServices/items/properties/objectId",
                "type": "string",
                "title": "The Objectid Schema",
                "default": "",
                "examples": [
                    "27283xvx9asdff"
                ],
                "pattern": "^(.*)$"
                },
                "objectType": {
                "$id": "#/properties/linkedPlanServices/items/properties/objectType",
                "type": "string",
                "title": "The Objecttype Schema",
                "default": "",
                "examples": [
                    "planservice"
                ],
                "pattern": "^(.*)$"
                }
            }
            }
        },
        "_org": {
            "$id": "#/properties/_org",
            "type": "string",
            "title": "The _org Schema",
            "default": "",
            "examples": [
            "example.com"
            ],
            "pattern": "^(.*)$"
        },
        "objectId": {
            "$id": "#/properties/objectId",
            "type": "string",
            "title": "The Objectid Schema",
            "default": "",
            "examples": [
            "12xvxc345ssdsds"
            ],
            "pattern": "^(.*)$"
        },
        "objectType": {
            "$id": "#/properties/objectType",
            "type": "string",
            "title": "The Objecttype Schema",
            "default": "",
            "examples": [
            "plan"
            ],
            "pattern": "^(.*)$"
        },
        "planType": {
            "$id": "#/properties/planType",
            "type": "string",
            "title": "The Plantype Schema",
            "default": "",
            "examples": [
            "inNetwork"
            ],
            "pattern": "^(.*)$"
        },
        "creationDate": {
            "$id": "#/properties/creationDate",
            "type": "string",
            "title": "The Creationdate Schema",
            "default": "",
            "examples": [
            "12-12-2017"
            ],
            "pattern": "^(.*)$"
        }
        }
    }