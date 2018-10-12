/* File Managing API */

// MySQL Settings
const MYSQL_HOST = "some ip or hostname";
const MYSQL_USER = "someuser";
const MYSQL_PASS = "somepass";
const MYSQL_DB = "somedbname";

// Directory to upload files to.
const filedir = '';
// Port that API will operate at.
const port = 3008;

// Module requires and express app intialization on given port
var path = require('path');
var mysql = require('mysql');
const fs = require('fs');
const express = require('express')
const fileUpload = require('express-fileupload');
const app = express();



app.use(fileUpload()); // File Upload Middleware
app.get('/', (req, res) => res.send('Hello There!'));

/* 
 URL Literal. No parameter is mandatory. They are all optional. If no parameter is given all data will return.
/getfiles?name=filename&?mime=mimetype&md5=hashofFile

*/
app.get('/getfiles', (req, res) => {
    var properties = {};
    if (req.params.name) {
        properties.name = req.params.name;
    }
    if (req.params.mime) {
        properties.mime = req.params.mime;
    }
    if (req.params.md5) {
        properties.md5 = req.params.md5;
    }

    getFiles(properties, (result) => {
        res.send(JSON.stringify(result));
    });
});

// Simple HTTP file uploading.
app.post('/fileupload', (req, res) => {
    if (!res.files) {
        return res.status(400).send('No files were uploaded.');
    }
    var file = req.files.upload;
    // Use the mv() method to place the file somewhere on your server
    var toDir = path.join(filedir, file.name);
    if (fs.existsSync(toDir)) {
        file.mv(toDir, function (err) {
            if (err)
                return res.status(500).send(err);

            newFile(file.name, toDir, file.mime, file.md5, fs.statSync(toDir).size);
            res.send('File uploaded!');
        });
    } else {
        var indexOfDot = file.name.indexOf(".");
        var newFilename = file.name.substring(0, indexOfDot - 1) + '0.' + file.name.substring(indexOfDot + 1, file.name.length); // One hell of a parser -_- it adds 0 to basename of file.
        var toDir = path.join(filedir, newFilename);
        file.mv(toDir, function (err) {
            if (err)
                return res.status(500).send(err);

            newFile(newFilename, toDir, file.mime, file.md5, fs.statSync(toDir).size);
            res.send('File uploaded!');
        });
    }
});


app.listen(port, () => console.log(`File Manager app listening on port ${port}!`))

/*
 newFile(string filename, string directory, string mimetype, string hash, int sizeinbytes)
 Creating a New File Entry in the Database.
*/
function newFile(name, dir, mime, md5, size) {
    var db = new dbConnection();
    db.query('INSERT INTO files VALUES(??,??,??,??,??)', [name, dir, mime, md5, size], (error) => {
        if (error) throw error;
    });
}

/*
 getFiles(obj property, func callback)
 Property Object Literal is like this.
 {
    name: @string 
    mime: @string
    md5:  @string 
 }

*/
function getFiles(property, callback) {
    var db = new dbConnection();
    var j = false;
    var queryString = 'SELECT * FROM files WHERE'
    if (property.name) {
        queryString += ' name =' + db.escape(property.name);
        j = true; // make j true so other checks know they should Put AND before theri appendix.
    }
    if (property.mime) {
        if (j) {
            queryString += ' AND mime =' + db.escape(property.mime);
        } else {
            queryString += ' mime =' + db.escape(property.mime);
            j = true;
        }
    }
    if (property.md5) {
        if (j) {
            queryString += ' AND md5 =' + db.escape(property.md5);
        } else {
            queryString += ' md5 =' + db.escape(property.md5);
            j = true;  // Not necessary but still... , in case of future uses.
        }
        // more cases can be added
    }

    var query = db.query(queryString, (err, results) => {
        if (err) throw err;
        callback(results);
    });
}

/*
 dbConnection Constructor
 Usage: var conn = new dbConnection();
 Returns a db connection for future use
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