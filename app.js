    module.exports = function (app, client) {
    // Defining modules
    var async = require('async');
    var redis = require('redis');
    var jwt = require('jsonwebtoken');
    var elasticsearch = require('elasticsearch');

    // Elastic Search
    var elasticClient = new elasticsearch.Client({  
        host: 'localhost:9200',
        log: 'info'
    });

    
    var indexName = "planindex";


    // Enabling Strong Etag
    app.set('etag', 'strong');

    // Data Validation
    var Validator = require('jsonschema').Validator;
    var v = new Validator();

    // JSON Schema
    var schema = {
        "$schema": "http://json-schema.org/draft-04/schema#",
        "title": "JSON Schema",
        "description": "JSON Schema for the Use Case",
        "type": "object",
        "properties": {
            "planCostShares": {
                "type": "object",
                "properties": {
                    "deductible": {
                        "type": "number"
                    },
                    "_org": {
                        "type": "string"
                    },
                    "copay": {
                        "type": "number"
                    },
                    "objectId": {
                        "type": "string"
                    },
                    "objectType": {
                        "type": "string"
                    }
                }
            },
            "linkedPlanServices": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "linkedService": {
                            "type": "object",
                            "properties": {
                                "_org": {
                                    "type": "string"
                                },
                                "objectId": {
                                    "type": "string"
                                },
                                "objectType": {
                                    "type": "string"
                                },
                                "name": {
                                    "type": "string"
                                }
                            }
                        },
                        "planserviceCostShares": {
                            "type": "object",
                            "properties": {
                                "deductible": {
                                    "type": "number"
                                },
                                "_org": {
                                    "type": "string"
                                },
                                "copay": {
                                    "type": "number"
                                },
                                "objectId": {
                                    "type": "string"
                                },
                                "objectType": {
                                    "type": "string"
                                }
                            }
                        },
                        "_org": {
                            "type": "string"
                        },
                        "objectId": {
                            "type": "string"
                        },
                        "objectType": {
                            "type": "string"
                        }
                    }
                }
            },
            "_org": {
                "type": "string"
            },
            "objectId": {
                "type": "string"
            },
            "objectType": {
                "type": "string"
            },
            "planType": {
                "type": "string"
            },
            "creationDate": {
                "type": "string"
            }
            // Testing by updating the JSON Schema
            // "endDate": {
            //     "type": "string"
            // }
        },
        "additionalProperties": false
    };

    

    // Rest API's
    app.get('/', function (req, res, next) {
        res.send('Hello from nodejs');
    });

    app.post('/plan', function (req, res, next) {
        console.log()
        if (req.headers.authorization) {
            var token = req.body.token || req.headers.authorization.split(" ")[1];
        } else {
            var token = req.body.token || req.query.token || req.headers['x-access-token'];
        }
        
        if (token) {
            jwt.verify(token, new Buffer('thisismytoken', 'base64'), function (err, decoded) {
                if (err) {
                    return res.status(401).json({
                        message: 'Failed to authenticate token : ' + err.message
                    });
                } else {
                    const uuidv1 = require('uuid/v1');
                    let _id = uuidv1();

                    let addPlan = req.body;

                    
                            let errors = v.validate(addPlan, schema).errors;
                            if (errors.length < 1) {

                                for (let key in addPlan) {
                                    // check also if property is not inherited from prototype
                                    if (addPlan.hasOwnProperty(key)) {
                                        let value = addPlan[key];
                                        if (typeof (value) == 'object') {
                                            if (value instanceof Array) {
                                                for (let i = 0; i < value.length; i++) {
                                                    let eachValue = value[i];
                                                    // console.log(eachValue);
                                                    for (let innerkey in eachValue) {
                                                        if (eachValue.hasOwnProperty(innerkey)) {
                                                            let innerValue = eachValue[innerkey];
                                                            if (typeof (innerValue) == 'object') {
                                                                client.hmset(_id + "-" + eachValue["objectType"] + "-" + eachValue["objectId"] + "-" + innerkey, innerValue, function (err, result) {
                                                                    if (err) {
                                                                        console.log(err);
                                                                    }
                                                                });
                                                                // client.sadd(_id + "-" + eachValue["objectType"]+"-"+eachValue["objectId"]+"-"+innerkey, _id + "-" + innerValue["objectType"]+"-"+innerValue["objectId"]);                                            
                                                            } else {
                                                                client.hset(_id + "-" + eachValue["objectType"] + "-" + eachValue["objectId"], innerkey, innerValue, function (err, result) {
                                                                    if (err) {
                                                                        console.log(err);
                                                                    }
                                                                });

                                                                // MAKE SURE YOU UNCOMMENT THIS.
                                                                client.sadd(_id + "-" + addPlan["objectType"] + "-" + addPlan["objectId"] + "-" + key, _id + "-" + eachValue["objectType"] + "-" + eachValue["objectId"]);
                                                            }
                                                        }
                                                    }
                                                }
                                            } else {
                                                for (let innerkey in value) {
                                                    let innerValue = value[innerkey];
                                                    client.hmset(_id + "-" + addPlan["objectType"] + "-" + addPlan["objectId"] + "-" + key, value, function (err, result) {
                                                        if (err) {
                                                            console.log(err);
                                                        }
                                                    });
                                                    // client.sadd(_id + "-" + addPlan["objectType"]+"-"+addPlan["objectId"]+"-"+key, _id + "-" + value["objectType"]+"-"+value["objectId"]);
                                                }
                                            }
                                        } else {
                                            client.hset(_id + "-" + addPlan["objectType"] + "-" + addPlan["objectId"], key, value, function (err, result) {
                                                if (err) {
                                                    console.log(err);
                                                }
                                            });
                                        }
                                    }
                                }

                                client.lpush("queue", JSON.stringify(addPlan));

                                client.brpoplpush("queue", "backupQueue", 0, handleJob);

                                function handleJob(err, data) {
                                    if(err) {
                                        console.log(err);
                                    } else {                            
                                        createIndex(req, res, data);
                                    }
                                }
                            
                                function createIndex(req, res, data) {
                                    elasticClient.indices.exists({
                                        index: indexName
                                    }).then(function(resp) {
                                        if(!resp) {
                                            elasticClient.indices.create({
                                                index: indexName
                                            }).then(function(resp) {
                                                elasticClient.index({
                                                    index: indexName,
                                                    type: 'plan',
                                                    id: _id,
                                                    body: data
                                                }).then(function(resp) {
                                                    let response = resp;
                                                }, function(err) {
                                                    console.log(err);
                                                });
                                            }, function(err) {
                                                console.log(err);
                                            });
                                        } else {
                                            elasticClient.index({
                                                index: indexName,
                                                type: 'plan',
                                                id: _id,
                                                body: data
                                            }).then(function(resp) {
                                                let response = resp;
                                            }, function(err) {
                                                console.log(err);
                                            });
                                        }
                                    }, function(err) {
                                        console.log(err);
                                    });
                                }                                
                                

                                res.status(201).send("The key of the newly created plan is: " + _id);                                
                            } else {
                                var errorArray = [];
                                for (let i = 0; i < errors.length; i++) {
                                    errorArray.push(errors[i].stack);
                                }
                                res.status(400).send(errorArray);
                            }
                    
                }
            });
        } else {
            return res.status(404).send({
                message: 'No token provided'
            });
        }
    });


    // Retrieve plan details using plan id
    app.get('/plan/:planId', function (req, res, next) {
        if (req.headers.authorization) {
            var token = req.body.token || req.headers.authorization.split(" ")[1];
        } else {
            var token = req.body.token || req.query.token || req.headers['x-access-token'];
        }
        if (token) {
            jwt.verify(token, new Buffer('thisismytoken', 'base64'), function (err, decoded) {
                if (err) {
                    return res.status(401).json({
                        message: 'Failed to authenticate token : ' + err.message
                    });
                } else {
                    let planId = req.params.planId;
                    // console.log(planId);

                    var plan = {};
                    plan["linkedPlanServices"] = [];
                    var linkedPlanServices = {};

                    // client.hgetall(planId , (err,result)=>{
                    //     res.status(200).json(result);
                    // })
                     
                    client.keys(planId + '*', function (err, plans) {
                        if (plans.length > 0) {
                            var keys = Object.keys(plans.sort());
                            var i = 0;
                            var l = 0;
                            keys.forEach(function (k) {
                                client.hgetall(plans[k], function (err, result) {
                                    i++;
                                    console.log(plans[k])
                                    console.log(result)
                                    if (plans[k].indexOf("planCostShares") > -1 && typeof (result) != "undefined") {
                                        console.log("586")
                                        plan["planCostShares"] = result;
                                    }

                                    if (plans[k].startsWith(planId + "-planservice-") && plans[k].indexOf("linkedService") < 0 && plans[k].indexOf("planserviceCostShares") < 0 && typeof (result) != "undefined") {
                                        var resultKeys = Object.keys(result);
                                        var resultValues = Object.values(result);
                                        console.log("593")
                                        for (var j = 0; j < resultKeys.length; j++) {
                                            console.log("595")
                                            linkedPlanServices[resultKeys[j]] = resultValues[j];
                                        }
                                    }

                                    if (plans[k].startsWith(planId + "-planservice-") && plans[k].indexOf("linkedService") > -1 && typeof (result) != "undefined") {
                                        linkedPlanServices["linkedService"] = result;
                                        console.log("602")
                                        if (linkedPlanServices["linkedService"] != undefined && linkedPlanServices["planserviceCostShares"] != undefined) {
                                            plan["linkedPlanServices"][l] = linkedPlanServices;
                                            l++;
                                            console.log("606")
                                            linkedPlanServices = {};
                                        }
                                    }

                                    if (plans[k].startsWith(planId + "-planservice-") && plans[k].indexOf("planserviceCostShares") > -1 && typeof (result) != "undefined") {
                                        linkedPlanServices["planserviceCostShares"] = result;
                                        console.log("613")
                                        if (linkedPlanServices["linkedService"] != undefined && linkedPlanServices["planserviceCostShares"] != undefined) {
                                            plan["linkedPlanServices"][l] = linkedPlanServices;
                                            l++;
                                            console.log("617")
                                            linkedPlanServices = {};
                                        }
                                    }

                                    if (plans[k].startsWith(planId + "-plan-") && plans[k].indexOf("planCostShares") < 0 && typeof (result) != "undefined") {
                                        var resultKeys = Object.keys(result);
                                        var resultValues = Object.values(result);
                                        console.log("625")
                                        for (var j = 0; j < resultKeys.length; j++) {
                                            console.log("627")
                                            plan[resultKeys[j]] = resultValues[j];
                                        }
                                    }

                                    if (i == keys.length) {
                                        console.log("633")                                        
                                        res.status(200).json(plan);
                                    }
                                });
                            });
                        } else {
                            res.status(404).send("Plan Id " + planId + " does not exists");
                        }
                    });
                }
            });
        } else {
            return res.status(404).send({
                message: 'No token provided'
            });
        }
    });

    // Update an existing plan
    app.put('/plan/:planId', function (req, res, next) {
        
        if (req.headers.authorization) {
            var token = req.body.token || req.headers.authorization.split(" ")[1];
        } else {
            var token = req.body.token || req.query.token || req.headers['x-access-token'];
        }
        if (token) {
            jwt.verify(token, new Buffer('thisismytoken', 'base64'), function (err, decoded) {
                if (err) {
                    return res.status(401).json({
                        message: 'Failed to authenticate token : ' + err.message
                    });
                } else {
                    let planId = req.params.planId;
                    let addPlan = req.body;                 

                            
                                client.keys(planId + "*", function (err, result) {
                                    if (err) {
                                        console.log(err);
                                    }
                                    if (result.length > 0) {
                                        client.del(result, function (err, deleted) {
                                            if (err) {
                                                console.log(err);
                                            }
                                            if (deleted) {
                                                for (let key in addPlan) {
                                                    // check also if property is not inherited from prototype
                                                    if (addPlan.hasOwnProperty(key)) {
                                                        let value = addPlan[key];
                                                        if (typeof (value) == 'object') {
                                                            if (value instanceof Array) {
                                                                for (let i = 0; i < value.length; i++) {
                                                                    let eachValue = value[i];
                                                                    // console.log(eachValue);
                                                                    for (let innerkey in eachValue) {
                                                                        if (eachValue.hasOwnProperty(innerkey)) {
                                                                            let innerValue = eachValue[innerkey];
                                                                            if (typeof (innerValue) == 'object') {
                                                                                client.hmset(planId + "-" + eachValue["objectType"] + "-" + eachValue["objectId"] + "-" + innerkey, innerValue, function (err, result) {
                                                                                    if (err) {
                                                                                        console.log(err);
                                                                                    }
                                                                                });
                                                                                // client.sadd(planId + "-" + eachValue["objectType"]+"-"+eachValue["objectId"]+"-"+innerkey, planId + "-" + innerValue["objectType"]+"-"+innerValue["objectId"]);                                            
                                                                            } else {
                                                                                client.hset(planId + "-" + eachValue["objectType"] + "-" + eachValue["objectId"], innerkey, innerValue, function (err, result) {
                                                                                    if (err) {
                                                                                        console.log(err);
                                                                                    }
                                                                                });

                                                                                // MAKE SURE YOU UNCOMMENT THIS.
                                                                                client.sadd(planId + "-" + addPlan["objectType"] + "-" + addPlan["objectId"] + "-" + key, planId + "-" + eachValue["objectType"] + "-" + eachValue["objectId"]);
                                                                            }
                                                                        }
                                                                    }
                                                                }
                                                            } else {
                                                                for (let innerkey in value) {
                                                                    let innerValue = value[innerkey];
                                                                    client.hmset(planId + "-" + addPlan["objectType"] + "-" + addPlan["objectId"] + "-" + key, value, function (err, result) {
                                                                        if (err) {
                                                                            console.log(err);
                                                                        }
                                                                    });
                                                                    // client.sadd(planId + "-" + addPlan["objectType"]+"-"+addPlan["objectId"]+"-"+key, planId + "-" + value["objectType"]+"-"+value["objectId"]);
                                                                }
                                                            }
                                                        } else {
                                                            client.hset(planId, key, value, function (err, result) {
                                                                if (err) {
                                                                    console.log(err);
                                                                }
                                                            });
                                                        }
                                                    }
                                                }
                                                
                                                elasticClient.index({
                                                    index: indexName,
                                                    type: 'plan',
                                                    id: planId,
                                                    body: addPlan
                                                }).then(function(resp) {
                                                    let response = resp;
                                                }, function(err) {
                                                    console.log(err);
                                                });

                                                res.status(200).send("The keys of the plan id " + planId + " are updated");
                                            } else {
                                                res.status(404).send("Plan Id " + planId + " does not exists");
                                            }
                                        });
                                    } else {
                                        res.status(404).send("Plan Id " + planId + " does not exists");
                                    }
                                });                           
                        
                }
            });
        } else {
            return res.status(404).send({
                message: 'No token provided'
            });
        }
    });

    // Delete plan using plan id
    app.delete('/plan/:planId', function (req, res, next) {
        if (req.headers.authorization) {
            var token = req.body.token || req.headers.authorization.split(" ")[1];
        } else {
            var token = req.body.token || req.query.token || req.headers['x-access-token'];
        }
        if (token) {
            jwt.verify(token, new Buffer('thisismytoken', 'base64'), function (err, decoded) {
                if (err) {
                    return res.status(401).json({
                        message: 'Failed to authenticate token : ' + err.message
                    });
                } else {
                    let planId = req.params.planId;

                    client.keys(planId + "*", function (err, result) {
                        if (err) {
                            console.log(err);
                        }
                        if (result.length > 0) {
                            client.del(result, function (err, deleted) {
                                if (err) {
                                    console.log(err);
                                }
                                if (deleted) {

                                    elasticClient.delete({
                                        index: indexName,
                                        type: 'plan',
                                        id: planId
                                    }).then(function(resp) {
                                        let response = resp;
                                    }, function(err) {
                                        console.log(err);
                                    });

                                    res.status(200).send("All the keys with Plan Id " + planId + " are deleted");
                                } else {
                                    res.status(404).send("Plan Id " + planId + " does not exists");
                                }
                            });
                        } else {
                            res.status(404).send("Plan Id " + planId + " does not exists");
                        }
                    });
                }
            });
        } else {
            return res.status(404).send({
                message: 'No token provided'
            });
        }
    });

    // Generate Token
    app.post('/token', function (req, res, next) {
        jwt.sign({
            'tokenCreator': "Tushar"
        }, new Buffer('thisismytoken', 'base64'), {
            expiresIn: 10000000000 
        }, function (err, token) {
            res.status(201).json({
                message: 'The token has been generated',
                token: token
            });
        });
    });


};
