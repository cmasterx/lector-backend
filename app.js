// index.js
// TODO add proper closing in database clients
/**
 * Required External Modules
 */

 const express = require('express');
 const path = require('path');
 const cors = require('cors');
 const cookieParser = require('cookie-parser');
 const bodyParser = require('body-parser');
 const MongoClient = require('mongodb').MongoClient;
 const bcrypt = require('bcrypt');          // hashing algorithm
 const crypto = require('crypto');          // generate uuid/tokens
 
 const mongoURI = "mongodb+srv://lector:lector@cluster0-f0sp3.azure.mongodb.net/test?retryWrites=true&w=majority";
 
/**
 * App Variables
 */
const app = express();
const port = process.env.PORT || "8000";
const staticPath = '/home/charliew/Documents/dev/hackathon/calhacks/lector-frontend/build';
// const staticPath = path.join(__dirname, 'static');


/**
 *  App Configuration
 */
app.use(cors());
app.use(cookieParser());
app.use(express.static(staticPath));
// app.use(express.static("/home/charliew/Documents/tamu/spring-2020/315_project_3"));
app.use(require('body-parser').json())

/**
 * functions
 */
function hasKeys(obj, keys) {
    for (var i = 0; i < keys.length; i++) {
        if (obj.hasOwnProperty(keys[i]) == false) return false;
    }

    return true;
}

function storeIfKeyExists(obj, store, key) {
    if (obj.hasOwnProperty(key)) {
        store[key] = obj[key];
    }
}

/**
 * Routes Definitions
 */
app.get('/meh', (req, res) => {
    res.status(200).send("Testing:");

    const mongo = new MongoClient(mongoURI, { useNewUrlParser: true });

    mongo.connect(err => {
        const collection = mongo.db("lector").collection("accounts");
        console.log(collection);
        mongo.close();
    })
    
});

app.get('/api', (req, res) => {
    if ("account_info" in req.query) {
        var token = req.cookies.token;

        if (token === undefined) {
            res.send({});
            return;
        }

        MongoClient.connect(mongoURI, function(err, client) {

            if (err) {
                res.send({});
                return;    
            }

            const db = client.db("lector");
            var cursor = db.collection("accounts").find({token: token});
            cursor.toArray(function(err, result) {
                if (err) {
                    res.send({});
                    return;    
                }

                delete result[0]["_id"];
                delete result[0]["password"];
                
                res.send(result[0]);
                return;
            })
        })
    }
    
    // res.send({
    //     first_name: "Bob",
    //     last_name: "Joe",
    //     email: "bob.joe@bobbyjoe.gov",
    //     phone_number: "12344569878",
    //     company: "Lector Technologies ©",
    //     "note from charlie": "This will automatically return account information if the user is logged in basd on their cookie"
    // });
})

app.get('/login', (req, res) => {
    console.log("Checking if user is logged in");

    var token = req.cookies.token;

    if (token === undefined) {
        res.send({"accept" : false});
    }
    else {
        MongoClient.connect(mongoURI, function(err, client) {

            if (err) {
                res.send({"accept" : false});
                client.close();
                return;
            }

            const db = client.db("lector");
            var cursor = db.collection("accounts").find({token: token});
            cursor.toArray(function(err, result) {
                if (err) {
                    res.send({"accept" : false});
                    return;    
                }
                
                res.send({"accept" : result.length != 0});
                return;
            });
        })
    }
});

app.post('/login', (req, res) => {
    console.log("Login Requested");
    loginInfo = req.body;

    if (hasKeys(loginInfo, ["email", "password"])) {

        MongoClient.connect(mongoURI, function(err, client) {

            if (err) {
                res.send({"success" : false});
                client.close();
                return;
            }

            const db = client.db("lector");
            var cursor = db.collection("accounts").find({email: loginInfo.email});
            cursor.toArray(function(err, result) {
                if (err) {
                    res.send({
                        success: false,
                        login_attempted: true
                    })
                    return;
                }

                console.log("Result:");

                for (var i = 0; i < result.length; i++) {
                    var pass = result[i].password;
                    
                    if (bcrypt.compareSync(loginInfo.password, pass)) {
                        console.log("Password match");

                        var token = crypto.randomBytes(64).toString('hex');
                        res.cookie('token', token, {maxAge: 1800000, httpOnly: true});

                        db.collection("accounts").updateOne({
                            email: loginInfo.email,
                            password: pass
                        }, 
                        {
                            $set : {token: token}
                        }).then(function(result) {
                            res.send({success : true});

                        })
                        
                        return;
                    }
                    else {
                    }
                }
                res.send({success: false});
            })
            console.log("Cursor:");
        });
    }
    else {
        res.send({"success" : false});
    }
});

app.post('/register', (req, res) => {
    console.log('Register Requested');
    regInfo = req.body;

    if (hasKeys(regInfo, ["first_name", "last_name", "email", "password"])) {

        MongoClient.connect(mongoURI, function(err, client) {
            if (err) throw err;
            const db = client.db("lector");

            var toStore = {
                first_name: regInfo.first_name,
                last_name: regInfo.last_name,
                email: regInfo.email,
                password: bcrypt.hashSync(regInfo.password, 10)
            }
            
            //checks for other keys
            storeIfKeyExists(regInfo, toStore, "linked_in");
            storeIfKeyExists(regInfo, toStore, "face_url");
            storeIfKeyExists(regInfo, toStore, "mentor");
            storeIfKeyExists(regInfo, toStore, "company");
            storeIfKeyExists(regInfo, toStore, "industry");
            storeIfKeyExists(regInfo, toStore, "phone_number");
            storeIfKeyExists(regInfo, toStore, "job");

            console.log(`Register Info:`);
            console.log(regInfo);
            
            db.collection("accounts").insertOne(toStore).then(
                function(result) {
                    res.send("Success");
                }
            )
        })
        
    }
    else {
        res.send("Fail");
    }
});

app.get('*', (req, res) => {
    res.status(200).send("Error 404");
});

/**
 * Server Ac
 */
app.listen(port, () => {
    console.log(`Listening to requests on http://localhost:${port}`);
  });

