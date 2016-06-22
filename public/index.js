// "myAwesomeDropzone" is the camelized version of the HTML element's ID
Dropzone.options.uploadZip = {
  paramName: "file", // The name that will be used to transfer the file
  maxFilesize: 20, // MB
  acceptedFiles: '.zip',
  maxFiles: 1,
  complete: function (res) {
    setTimeout(function () {
      self.removeAllFiles();
    }, 3000);

    if (res.status !== 'success') {
      return alert('Something went wrong!');
    }

    var self = this;

    var doneMessage = document.getElementsByClassName('done-message')[0];
    doneMessage.style.display = 'block';
    doneMessage.style.opacity = '1';

    window.location.pathname = window.location.pathname + 'download/' + res.xhr.response;
  }
};