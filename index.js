const express = require('express');
const promisify = require('tiny-promisify');
const fs = require('fs');
const unzip = require('unzip');
const rimraf = require('rimraf');
const formidable = require('formidable');
const exec = promisify(require('child_process').exec);
const request = require('request');
const friendly = require("friendly-ids");
const ncp = require('ncp').ncp;

const app = express();

app.use(express.static('public'));

var pool = [];
var poolStatus = {};

const claimPoolEntry = handler => {
    if (pool.length) { //If we have spare items ready
        newPoolEntry(Object);
        handler(pool.pop());
    } else { //Else create 2 new ones and assign one
        newPoolEntry(id => {
            handler(id);
            newPoolEntry(Object);
        });
    }
}

const newPoolEntry = handler => {
    const id = friendly();

    ncp(`./template`, `./pool/${id}`, function (err) {
        if (err) {
            return console.error(err);
        }
        pool.push(id);
        handler(id);
    });
};

const deletePoolEntry = id => {
    rimraf(`./pool/${id}`, err => {
        if (err) console.error(err);
    });
}

const scheduleEntryDeletion = id => {
    setTimeout(_ => deletePoolEntry(id), 10000000);
};

//******** INIT ********//
fs.readdir('./pool', (err, files) => {
    files.filter(file => file !== '.gitignore').forEach(file => {
        rimraf(`./pool/${file}`, err => {
            if (err) console.error(err);
        });
    });


    //Initialize with a single item in pool
    newPoolEntry(Object);

});


//******** App ********//

app.get('/', function (req, res) {
    fs.createReadStream('index.html').pipe(res);
});

/*
const compileApp = handler => _ => exec('cd template && cordova build android', handler);
const dlApp = res => {
    return function (error, stdout, stderr) {
        if (error) return res.send(error);
        res.download('template/platforms/android/build/outputs/apk/android-debug.apk');
    };
};*/

const handleDownload = (stream, id, res) => {
    stream.on('close', _ => {
        console.info(`Building ${id}`);
        res.redirect(`/done/${id}`);
        exec(`cd ./pool/${id} && cordova build android`).then((error, stdout, stderr) => {
            poolStatus[id] = true;
        });
        scheduleEntryDeletion();
    });
}

const checkDone = (id, handler) => {
    if (poolStatus[id]) handler();
    else setTimeout(_ => checkDone(id, handler), 2500);
};

app.get('/download/:id', (req, res) => {
    checkDone(req.params.id, _ => {
        console.log(`Downloading ${req.params.id}`);
        res.download(`./pool/${req.params.id}/platforms/android/build/outputs/apk/android-debug.apk`, `${req.params.id}.apk`);
    });
});

app.get('/done/:id', (req, res) => {
    res.send(`Click to start download: <a target='_blank' href='/download/${req.params.id}'>${req.params.id}.apk</a>.`);
});


app.post('/zip', function (req, res) {
    const form = new formidable.IncomingForm();

    claimPoolEntry(id => {
        console.log(`Item uploaded as ${id}`);
        form.parse(req, function (err, fields, files) {
            handleDownload(fs.createReadStream(files.appZip.path)
                .pipe(unzip.Extract({ path: `./pool/${id}/www/app/` })), id, res);
        });
    });
});

app.post('/url', function (req, res) {
    var form = new formidable.IncomingForm();

    claimPoolEntry(id => {
        form.parse(req, function (err, fields, files) {
            handleDownload(request(fields.appURL)
                .pipe(fs.createWriteStream(`./pool/${id}/www/app/index.html`)), id, res);
        });
    });
});

app.listen(1337);