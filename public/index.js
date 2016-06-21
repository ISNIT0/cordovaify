// "myAwesomeDropzone" is the camelized version of the HTML element's ID
Dropzone.options.uploadZip = {
  paramName: "file", // The name that will be used to transfer the file
  maxFilesize: 20, // MB
  acceptedFiles: '.zip',
  maxFiles: 1,
  complete: function (res) {
    if (res.status !== 'success') {
      return alert('Something went wrong!');
    }

    var self = this;

    var doneMessage = document.getElementsByClassName('done-message')[0];
    doneMessage.style.display = 'block';
    doneMessage.style.opacity = '1';

    document.getElementsByClassName('download-link')[0].setAttribute('href', '/download/' + res.xhr.response);

    setTimeout(function () {
      self.removeAllFiles();
    }, 3000);
  }
};