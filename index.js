const express = require('express');
const fs = require('fs');
const unzip = require('unzip');
const rimraf = require('rimraf');
const formidable = require('formidable');
const exec = require('child_process').exec;
const request = require('request');
const friendly = require("friendly-ids");
const xmlify = require('./xmlify.js');

const app = express();

app.use(express.static('public'));

var poolStatus = {};

const newPoolEntry = handler => {
    const id = friendly();

    scheduleEntryDeletion(id);

    exec(`(cd pool && 
    cordova create ${id} xyz.reeve.${id.replace(/[-0-9]/g, '')} ${id} && 
    cd ${id} && 
    cordova platform add android &&
    rm -rf www/*)`, function (err, stdout, stderr) {
            if (err || stderr) return console.error(err, stderr);
            handler(id);
        });
};

const deletePoolEntry = id => {
    rimraf(`./pool/${id}`, err => {
        if (err) console.error(err);
    });
}

const scheduleEntryDeletion = id => {
    setTimeout(_ => deletePoolEntry(id), 100000);
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

const handleDownload = (stream, id, res) => {
    stream.on('close', _ => {
        console.info(`Building ${id}`);


        var defaultConfig = require('./defaultConfig');
        defaultConfig.widget.id = 'xyz.reeve.' + id.replace(/[-0-9]/g, '');
        defaultConfig.widget.content.name = id;

        var config;
        try {
            if (fs.existsSync(`./pool/${id}/www/config.json`)) //TODO: update to use a non deprecated function
                config = JSON.parse(fs.readFileSync(`./pool/${id}/www/config.json`, 'utf8'));
            if (fs.existsSync(`./pool/${id}/www/icon.png`)) //If icon.png is present, auto add it as the logo
                defaultConfig.widget.content.icon = { "src": "www/icon.png" };
        } catch (e) {
            return res.status(500).send(e);
        };

        var xmlConfig;
        if (!config) //No custom config
            xmlConfig = xmlify(defaultConfig);
        else if (config.widget) { //They have defined everything
            xmlConfig = xmlify(config);
        } else if (config.id) {
            var widgetConfig = Object.assign(defaultConfig.widget, config);
            xmlConfig = xmlify(Object.assign(defaultConfig, { widget: widgetConfig }));
        } else {
            var contentConfig = Object.assign(defaultConfig.widget.content, config);
            var widgetConfig = Object.assign(defaultConfig.widget, { content: contentConfig });
            xmlConfig = xmlify(Object.assign(defaultConfig, { widget: widgetConfig }));
        };

        xmlConfig = "<?xml version='1.0' encoding='utf-8'?>\n" + xmlConfig;
        fs.writeFileSync(`./pool/${id}/config.xml`, xmlConfig, 'utf8');

        res.send(id);

        exec(`cd ./pool/${id} && cordova build android`, (error, stdout, stderr) => {
            if (error) {
                console.log(`Build of ${id} failed`);
                console.error(error, stderr);
                poolStatus[id] = false;
            } else {
                console.log(`Build of ${id} complete - it's ready to be downloaded.`);
                poolStatus[id] = true;
            }
        });
    });
}

const checkDone = (id, handler) => {
    if (typeof poolStatus[id] === 'undfined')
        return handler(`Can't find item with id of ${id}`);
    else if (poolStatus[id] === false)
        return handler(`Looks like your build failed, check your config.json file`);
    else if (poolStatus[id] === true)
        handler(null);
    else
        setTimeout(_ => checkDone(id, handler), 2500);
};

app.get('/download/:id', (req, res) => {
    checkDone(req.params.id, err => {
        if (err) return res.send(err);
        console.log(`Downloading ${req.params.id}`);
        res.download(`./pool/${req.params.id}/platforms/android/build/outputs/apk/android-debug.apk`, `${req.params.id}.apk`);
    });
});

app.post('/zip', function (req, res) {
    const form = new formidable.IncomingForm();

    newPoolEntry(id => {
        console.log(`Item uploaded as ${id}`);
        form.parse(req, function (err, fields, files) {
            if (!(files && files.file && files.file.path)) res.send('There was an error with the upload', 500);
            handleDownload(fs.createReadStream(files.file.path)
                .pipe(unzip.Extract({ path: `./pool/${id}/www/` })), id, res);
        });
    });
});

app.post('/url', function (req, res) {
    var form = new formidable.IncomingForm();

    claimPoolEntry(id => {
        form.parse(req, function (err, fields, files) {
            handleDownload(request(fields.appURL)
                .pipe(fs.createWriteStream(`./pool/${id}/www/index.html`)), id, res);
        });
    });
});

app.listen(1337);