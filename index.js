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
app.use('/example', express.static('example'));

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
            poolStatus[id] = 'pending';
            handler(id);
        });
};

const deletePoolEntry = id => {
    rimraf(`./pool/${id}`, err => {
        delete poolStatus[id];
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

app.get('/done/:id/:final', (req, res) => {
    const id = req.params.id;

    if(poolStatus[id] !== true) res.redirect(`/download/${id}`);

    if(req.params.final === 'true')
        res.download(`./pool/${id}/platforms/android/build/outputs/apk/android-debug.apk`, `${id}.apk`);
    else
        fs.createReadStream('./public/done.html').pipe(res);
});

app.get('/download/:id', (req, res) => {
    const id = req.params.id;

    if (typeof poolStatus[id] === 'undefined')
        fs.createReadStream('./public/missing.html').pipe(res);
    else if (poolStatus[id] === false)
        fs.createReadStream('./public/fail.html').pipe(res);
    else if (poolStatus[id] === true)
        res.redirect(`/done/${id}/false`)
    else
        fs.createReadStream('./public/wait.html').pipe(res);
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