FROM node:argon

RUN \
npm i -g cordova pm2 && \
apt-get update && \
apt-get install -y lib32stdc++6 lib32z1 default-jre default-jdk openjdk-7-jdk

# download and extract android sdk
RUN curl http://dl.google.com/android/android-sdk_r24.2-linux.tgz | tar xz -C /usr/local/
ENV ANDROID_HOME /usr/local/android-sdk-linux
ENV PATH $PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools

# update and accept licences
RUN ( sleep 5 && while [ 1 ]; do sleep 1; echo y; done ) | /usr/local/android-sdk-linux/tools/android update sdk --no-ui -a --filter platform-tool,build-tools-22.0.1,android-22; \
    find /usr/local/android-sdk-linux -perm 0744 | xargs chmod 755


# get cordovaify
RUN \
git clone https://github.com/isnit0/cordovaify.git /app && \
cd /app && \
npm i

WORKDIR /app

EXPOSE 1337
CMD ["npm", "start"]
