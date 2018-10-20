/* jshint node: true */
/*jshint esversion: 6 */
/* File Managing API */

// MySQL Settings
/** @constant
    @type {string}
*/
const MYSQL_HOST = "some ip or hostname";
/** @constant
    @type {string}
*/
const MYSQL_USER = "someuser";
/** @constant
    @type {string}
*/
const MYSQL_PASS = "somepass";
/** @constant
    @type {string}
*/
const MYSQL_DB = "somedbname";

// Directory to upload files to.
/** @constant
    @type {string}
*/
const FILE_DIR = '';
// port that API will operate at.
/** @constant
    @type {int}
    @default
*/
const PORT = 3008;

// Module requires and express app intialization on given port
const mime = require('mime');
var path = require('path');
var mysql = require('mysql');
const fs = require('fs');
const express = require('express');
const fileUpload = require('express-fileupload');
const app = express();



app.use(fileUpload()); // File Upload Middleware
app.get('/', (req, res) => res.send('Hello There!'));

/* 
 URL Literal. No parameter is mandatory. They are all optional. If no parameter is given all data will return.
/getfiles?name=filename&?mime=mimetype&hash=hashofFile&time=timestamp

*/
app.get('/getfiles', (req, res) => {
    var properties = {};
    if (req.params.name) {
        properties.name = req.params.name;
    }
    if (req.params.mime) {
        properties.mime = req.params.mime;
    }
    if (req.params.hash) {
        properties.hash = req.params.hash;
    }
    if (req.params.time) {
        properties.time = req.params.time;
    }

    getFiles(properties, (result) => {
        res.send(JSON.stringify(result));
    });
});

// Simple HTTP file uploading.
app.post('/fileupload', (req, res) => {
    if (!req.files) {
        return res.status(400).send('No files were uploaded.');
    }
    var file = req.files.upload;
    // Use the mv() method to place the file somewhere on your server
    var toDir = path.join(FILE_DIR, file.name);
    if (!fs.existsSync(toDir)) {
        file.mv(toDir, function (err) {
            if (err)
                return res.status(500).send(err);

            newFile(file.name, toDir, mime.getType(extension), fs.statSync(toDir).size);
            res.send('File uploaded!');
        });
    } else {
        var indexOfDot = file.name.indexOf(".");
        var extension = file.name.substring(indexOfDot + 1, file.name.length);
        var newFilename = file.name.substring(0, indexOfDot) + '0.' + extension; // One hell of a parser -_- it adds 0 to basename of file.
        toDir = path.join(FILE_DIR, newFilename);
        file.mv(toDir, function (err) {
            if (err)
                return res.status(500).send(err);

            newFile(newFilename, toDir, mime.getType(extension), fs.statSync(toDir).size);
            res.send('File uploaded!');
        });
    }
});


app.listen(PORT, () => console.log(`File Manager app listening on port ${PORT}!`));

/**
 * Creates a new file register in the Database.
 * @param {string} name - Full name of the file.
 * @param {string} dir - Full directory of file. Also includes file name.
 * @param {string} mime - MIME type of the file.
 * @param {int} size - Size of the file as bytes.
 */
function newFile(name, dir, mime, size) {
    var db = new dbConnection();
    db.query('INSERT INTO files(name,dir,mime,size,time) VALUES(?,?,?,?,?)', [name, dir, mime, size, Math.floor(Date.now() / 1000)], (error,results) => {
        if (error) throw error;
        calculateHash(results.insertId,dir); // Will calculate hash async and then will edit database accordingly.
    });
}

/**
 * Get's files with the given filter
 * @param {object} filter - Configuration object.
 *Filter Object Literal is like this.
 *{
 *   name: {String}
 *   mime: {String}
 *   hash:  {String} 
 *   time: {Number}
 * }
 * @param {function} callback - Callback Function -> (results)=>{...}
 */
function getFiles(filter, callback) {
    var db = new dbConnection();
    var j = false;
    var queryString = 'SELECT * FROM files';
    if (filter.name) {
        queryString += ' name =' + db.escape(filter.name);
        j = true; // make j true so other checks know they should Put AND before theri appendix.
    }
    if (filter.mime) {
        if (j) {
            queryString += ' AND mime =' + db.escape(filter.mime);
        } else {
            queryString += ' WHERE mime =' + db.escape(filter.mime);
            j = true;
        }
    }
    if (filter.hash) {
        if (j) {
            queryString += ' AND hash =' + db.escape(filter.hash);
        } else {
            queryString += ' WHERE hash =' + db.escape(filter.hash);
            j = true;
        }
        if (filter.hash) {
            if (j) {
                queryString += ' AND time =' + db.escape(filter.time);
            } else {
                queryString += ' WHERE time =' + db.escape(filter.time);
                j = true; // Not necessary but still... , in case of future uses.
            }
            // more cases can be added
        }
    }
        db.query(queryString, (err, results) => {
            if (err) throw err;
            callback(results);
        });
    }

    /**
     * @constructor Database Connection
     */
    function dbConnection() {
        var connection = mysql.createConnection({
            host: MYSQL_HOST,
            user: MYSQL_USER,
            password: MYSQL_PASS,
            database: MYSQL_DB
        });

        connection.connect();
        return connection;
    }
    /**
     * xxHash Hashing Function
     * @param {string} data 
     */
    function hash(data) {
        var XXH = require("xxhashjs");
        var H = XXH.h32(0xABCD); // Seed is 0xABCD
        return H.update(data).digest().toString(16);
    }
/**
 * Calculates hash using xxHash then also updates database. 
 * @param {Number} id 
 * @param {String} filedir 
 */
    function calculateHash(id,filedir){
        fs.readFile(filedir,(err,data)=>{
        if(err) console.log("Error: '" + filedir + "' Can't read this file so hash can't be calculated !");
        else{
            var calculatedHash = hash(data);
            var db = new dbConnection();
            db.query("UPDATE files SET hash=? WHERE id=?", [calculatedHash,id]);
        }
        });
    }