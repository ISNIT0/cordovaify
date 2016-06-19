const express = require('express');
const fs = require('fs');
const unzip = require('unzip');
const rimraf = require('rimraf');
const formidable = require('formidable');
const exec = require('child_process').exec;
const request = require('request');

const app = express();

app.get('/', function (req, res) {
    fs.createReadStream('index.html').pipe(res);
});

const compileApp = handler => _ => exec('cd template && cordova build android', handler);
const dlApp = res => {
    return function (error, stdout, stderr) {
        if (error) return res.send(error);
        res.download('template/platforms/android/build/outputs/apk/android-debug.apk');
    };
};


app.post('/zip', function (req, res) {
    rimraf('template/www/app', function (err) {
        if (err) return res.send(err);

        fs.mkdir('template/www/app', function (err) {
            if (err) return res.send(err);


            var form = new formidable.IncomingForm();

            form.parse(req, function (err, fields, files) {
                fs.createReadStream(files.appZip.path)
                    .pipe(unzip.Extract({ path: 'template/www/app/' })).on('close', compileApp(dlApp(res)));
            });
        });

    });
});

app.post('/url', function (req, res) {
    rimraf('template/www/app', function (err) {
        if (err) return res.send(err);

        fs.mkdir('template/www/app', function (err) {
            if (err) return res.send(err);

            const WriteStream = fs.createWriteStream('template/www/app/index.html');

            var form = new formidable.IncomingForm();
            form.parse(req, function (err, fields, files) {
                console.log(fields)
                request(fields.appURL)
                    .pipe(WriteStream).on('close', compileApp(dlApp(res)));
            });
        });

    });
});

app.listen(1337);