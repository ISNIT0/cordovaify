# cordovaify
Easily convert HTML into Cordova apps without installing anything.

If you are looking to deploy this, your best bet is using [docker-cordovaify](https://github.com/ISNIT0/docker-cordovaify), else you'll be stuck fighting various incompatible versions of headless Java/Android tooling chains.

# Running Locally
```bash
> npm i && npm start
```

# How it Works
Cordovaify is fairly simple in it's working:
* 150 line Express app handles requests
* Uploaded zips are unzipped to a clean 'pool' (Cordova Project) and cordova build command is run
