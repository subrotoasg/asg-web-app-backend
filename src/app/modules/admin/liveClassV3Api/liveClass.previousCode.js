require("dotenv").config();
const express = require("express");
const app = express.Router();
var nclass = require("../models/classes.js");
var centralBunny = require("../config/central.js");
var abhiBunny = require("../config/abhi.js");
var tofaelBunny = require("../config/tofael.js");
var axios = require("axios");
const ArchiveClass = require("../models/ArchiveClass.js");

app.post("/", (req, res) => {
  const { room_id, event_name, session_id, data } = req.body;

  if (event_name == "room.created") {
    nclass
      .findOneAndUpdate(
        {
          Video_Id: room_id,
        },
        {
          $set: {
            session_id: session_id,
            Status: "Live",
            start: new Date(),
          },
        },
        {
          upsert: false,
        },
      )
      .exec(function (err, Class) {
        if (err) {
          res.send({ status: 400, message: err.message });
        } else {
          if (Class != null) {
            ArchiveClass.findOneAndUpdate(
              {
                videoId: room_id,
              },
              {
                $set: {
                  session_id: session_id,
                  status: "Live",
                  start: new Date(),
                },
              },
              {
                upsert: false,
              },
            ).exec(function (archiveErr, archiveClass) {
              console.log(archiveClass);
              if (archiveErr) {
                res.send({
                  status: 400,
                  message: "Error updating ArchiveClass: " + archiveErr.message,
                });
              } else {
                res.send({
                  status: 200,
                  message:
                    room_id +
                    " Started ! on " +
                    new Date().toLocaleDateString("en-In"),
                });
              }
            });
          } else {
            res.send({ status: 404, message: "No Class Found !" });
          }
        }
      });
  } else if (event_name == "room.closed") {
    nclass
      .findOneAndUpdate(
        {
          Video_Id: room_id,
        },
        {
          $set: {
            Status: "Ended",
            end: new Date(),
          },
        },
        {
          upsert: false,
        },
      )
      .exec(function (err, Class) {
        if (err) {
          res.send({ status: 400, message: err.message });
        } else {
          if (Class != null) {
            // Update the ArchiveClass model
            ArchiveClass.findOneAndUpdate(
              {
                videoId: room_id,
              },
              {
                $set: {
                  status: "Ended",
                  end: new Date(),
                },
              },
              {
                upsert: false,
              },
            ).exec(function (archiveErr, archiveClass) {
              if (archiveErr) {
                res.send({
                  status: 400,
                  message: "Error updating ArchiveClass: " + archiveErr.message,
                });
              } else {
                var datas = JSON.stringify({
                  client_id: process.env.client_id,
                  auth_key: process.env.auth_key,
                  room_id: room_id,
                });

                var config = {
                  method: "post",
                  url: "https://api.teachmint.com/remove/room",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  data: datas,
                };

                axios(config)
                  .then(function (response) {
                    res.send({
                      status: 200,
                      message:
                        room_id +
                        " Ended and closed ! on " +
                        new Date().toLocaleDateString("en-In"),
                    });
                  })
                  .catch(function (error) {
                    res.send({
                      status: 200,
                      message:
                        room_id +
                        " Ended ! on " +
                        new Date().toLocaleDateString("en-In"),
                    });
                  });
              }
            });
          } else {
            res.send({ status: 404, message: "No Class Found !" });
          }
        }
      });
  } else if (event_name == "recording.processed") {
    // let uploadData = JSON.stringify({
    // "title": room_id,
    // "inputs": [
    // {
    // "url": data.processed_path
    // }
    // ],
    // "resolutions": [
    // "240p",
    // "360p",
    // "480p",
    // "720p"
    // ],
    // "enable_drm": true,
    // "folder": "pXCUTCGKH5M"
    // });

    // let config = {
    // method: 'post',
    // maxBodyLength: Infinity,
    // url: 'https://app.tpstreams.com/api/v1/'+ process.env.tporg +'/assets/videos/',
    // headers: {
    // "Authorization": "Token " + process.env.tpauth,
    // 'Content-Type': 'application/json'
    // },
    // data: uploadData
    // };

    nclass
      .findOne({
        Video_Id: room_id,
      })
      .then(function (course) {
        if (abhiBunny.includes(course.Batch)) {
          let uploadData = JSON.stringify({
            url: data.processed_path,
          });

          let config = {
            method: "post",
            url: "https://video.bunnycdn.com/library/245245/videos/fetch",
            headers: {
              accept: "application/json",
              "content-type": "application/*+json",
              AccessKey: process.env.AbhibunnyAuthKey,
            },
            data: uploadData,
          };
          axios
            .request(config)
            .then((response) => {
              nclass
                .findOneAndUpdate(
                  {
                    Video_Id: room_id,
                  },
                  {
                    $set: {
                      session_id: data.session_id,
                      tsid: data._id,
                      raw: data.raw_path,
                      rec: data.processed_path,
                      // tpstreams: response.data.id,
                      bunny: response.data.id,
                      thumbnail_256x144_path: data.thumbnail_256x144_path,
                      thumbnail_path: data.thumbnail_path,
                      Duration: data.duration,
                    },
                  },
                  {
                    upsert: false,
                  },
                )
                .exec(function (err, Class) {
                  if (err) {
                    res.send({ status: 400, message: err.message });
                  } else {
                    if (Class != null) {
                      res.send({
                        status: 200,
                        message:
                          room_id +
                          " is transcoding ! on " +
                          new Date().toLocaleDateString("en-In"),
                      });
                    } else {
                      res.send({ status: 404, message: "No Class Found !" });
                    }
                  }
                });
            })
            .catch((error) => {
              nclass
                .findOneAndUpdate(
                  {
                    Video_Id: room_id,
                  },
                  {
                    $set: {
                      Status: "Recorded",
                      session_id: data.session_id,
                      tsid: data._id,
                      raw: data.raw_path,
                      rec: data.processed_path,
                      thumbnail_256x144_path: data.thumbnail_256x144_path,
                      thumbnail_path: data.thumbnail_path,
                      Duration: data.duration,
                    },
                  },
                  {
                    upsert: false,
                  },
                )
                .exec(function (err, Class) {
                  if (err) {
                    res.send({ status: 400, message: err.message });
                  } else {
                    if (Class != null) {
                      console.log(error);
                      res.send({
                        status: 200,
                        message:
                          room_id +
                          " is recorded ! on " +
                          new Date().toLocaleDateString("en-In"),
                      });
                    } else {
                      res.send({ status: 404, message: "No Class Found !" });
                    }
                  }
                });
            });
        } else if (tofaelBunny.includes(course.Batch)) {
          let uploadData = JSON.stringify({
            url: data.processed_path,
          });

          let config = {
            method: "post",
            url: "https://video.bunnycdn.com/library/245406/videos/fetch",
            headers: {
              accept: "application/json",
              "content-type": "application/*+json",
              AccessKey: process.env.TofaelbunnyAuthKey,
            },
            data: uploadData,
          };
          axios
            .request(config)
            .then((response) => {
              nclass
                .findOneAndUpdate(
                  {
                    Video_Id: room_id,
                  },
                  {
                    $set: {
                      session_id: data.session_id,
                      tsid: data._id,
                      raw: data.raw_path,
                      rec: data.processed_path,
                      // tpstreams: response.data.id,
                      bunny: response.data.id,
                      thumbnail_256x144_path: data.thumbnail_256x144_path,
                      thumbnail_path: data.thumbnail_path,
                      Duration: data.duration,
                    },
                  },
                  {
                    upsert: false,
                  },
                )
                .exec(function (err, Class) {
                  if (err) {
                    res.send({ status: 400, message: err.message });
                  } else {
                    if (Class != null) {
                      res.send({
                        status: 200,
                        message:
                          room_id +
                          " is transcoding ! on " +
                          new Date().toLocaleDateString("en-In"),
                      });
                    } else {
                      res.send({ status: 404, message: "No Class Found !" });
                    }
                  }
                });
            })
            .catch((error) => {
              nclass
                .findOneAndUpdate(
                  {
                    Video_Id: room_id,
                  },
                  {
                    $set: {
                      Status: "Recorded",
                      session_id: data.session_id,
                      tsid: data._id,
                      raw: data.raw_path,
                      rec: data.processed_path,
                      thumbnail_256x144_path: data.thumbnail_256x144_path,
                      thumbnail_path: data.thumbnail_path,
                      Duration: data.duration,
                    },
                  },
                  {
                    upsert: false,
                  },
                )
                .exec(function (err, Class) {
                  if (err) {
                    res.send({ status: 400, message: err.message });
                  } else {
                    if (Class != null) {
                      console.log(
                        "Failed " +
                          room_id +
                          " is recorded ! on " +
                          new Date().toLocaleDateString("en-In"),
                      );
                      console.log(error);
                      res.send({
                        status: 200,
                        message:
                          room_id +
                          " is recorded ! on " +
                          new Date().toLocaleDateString("en-In"),
                      });
                    } else {
                      res.send({ status: 404, message: "No Class Found !" });
                    }
                  }
                });
            });
        } else {
          let uploadData = JSON.stringify({
            url: data.processed_path,
          });

          let config = {
            method: "post",
            url: "https://video.bunnycdn.com/library/173049/videos/fetch",
            headers: {
              accept: "application/json",
              "content-type": "application/*+json",
              AccessKey: process.env.bunnyAuthKey,
            },
            data: uploadData,
          };

          axios
            .request(config)
            .then((response) => {
              // Update in nclass database
              nclass
                .findOneAndUpdate(
                  {
                    Video_Id: room_id,
                  },
                  {
                    $set: {
                      session_id: data.session_id,
                      tsid: data._id,
                      raw: data.raw_path,
                      rec: data.processed_path,
                      bunny: response.data.id,
                      thumbnail_256x144_path: data.thumbnail_256x144_path,
                      thumbnail_path: data.thumbnail_path,
                      Duration: data.duration,
                    },
                  },
                  {
                    upsert: false,
                  },
                )
                .exec(function (err, Class) {
                  if (err) {
                    res.send({ status: 400, message: err.message });
                  } else {
                    if (Class != null) {
                      // Update in ArchiveClass database
                      ArchiveClass.findOneAndUpdate(
                        {
                          videoId: room_id,
                        },
                        {
                          $set: {
                            status: "Recorded",
                            session_id: data.session_id,
                            tsid: data._id,
                            raw: data.raw_path,
                            rec: data.processed_path,
                            bunny: response.data.id,
                            thumbnail_256x144_path: data.thumbnail_256x144_path,
                            thumbnail_path: data.thumbnail_path,
                            Duration: data.duration,
                          },
                        },
                        {
                          upsert: false,
                        },
                      ).exec(function (err, archivedClass) {
                        if (err) {
                          res.send({ status: 400, message: err.message });
                        } else {
                          if (archivedClass != null) {
                            res.send({
                              status: 200,
                              message:
                                room_id +
                                " is transcoding ! on " +
                                new Date().toLocaleDateString("en-In"),
                            });
                          } else {
                            res.send({
                              status: 404,
                              message: "No Archive Class Found !",
                            });
                          }
                        }
                      });
                    } else {
                      res.send({ status: 404, message: "No Class Found !" });
                    }
                  }
                });
            })
            .catch((error) => {
              // Update in nclass database in case of failure
              nclass
                .findOneAndUpdate(
                  {
                    Video_Id: room_id,
                  },
                  {
                    $set: {
                      Status: "Recorded",
                      session_id: data.session_id,
                      tsid: data._id,
                      raw: data.raw_path,
                      rec: data.processed_path,
                      thumbnail_256x144_path: data.thumbnail_256x144_path,
                      thumbnail_path: data.thumbnail_path,
                      Duration: data.duration,
                    },
                  },
                  {
                    upsert: false,
                  },
                )
                .exec(function (err, Class) {
                  if (err) {
                    res.send({ status: 400, message: err.message });
                  } else {
                    if (Class != null) {
                      console.log(
                        "Failed " +
                          room_id +
                          " is recorded ! on " +
                          new Date().toLocaleDateString("en-In"),
                      );
                      console.log(error);
                      res.send({
                        status: 200,
                        message:
                          room_id +
                          " is recorded ! on " +
                          new Date().toLocaleDateString("en-In"),
                      });

                      // Update in ArchiveClass database in case of failure
                      ArchiveClass.findOneAndUpdate(
                        {
                          videoId: room_id,
                        },
                        {
                          $set: {
                            status: "Recorded",
                            session_id: data.session_id,
                            tsid: data._id,
                            raw: data.raw_path,
                            rec: data.processed_path,
                            thumbnail_256x144_path: data.thumbnail_256x144_path,
                            thumbnail_path: data.thumbnail_path,
                            Duration: data.duration,
                          },
                        },
                        {
                          upsert: false,
                        },
                      ).exec(function (err, archivedClass) {
                        if (err) {
                          res.send({ status: 400, message: err.message });
                        } else {
                          if (archivedClass != null) {
                            console.log("Failed Archive update completed.");
                          } else {
                            console.log("No Archive class found to update.");
                          }
                        }
                      });
                    } else {
                      res.send({ status: 404, message: "No Class Found !" });
                    }
                  }
                });
            });
        }
      })
      .catch(function (error) {
        nclass
          .findOneAndUpdate(
            {
              Video_Id: room_id,
            },
            {
              $set: {
                Status: "Recorded",
                session_id: data.session_id,
                tsid: data._id,
                raw: data.raw_path,
                rec: data.processed_path,
                thumbnail_256x144_path: data.thumbnail_256x144_path,
                thumbnail_path: data.thumbnail_path,
                Duration: data.duration,
              },
            },
            {
              upsert: false,
            },
          )
          .exec(function (err, Class) {
            if (err) {
              res.send({ status: 400, message: err.message });
            } else {
              if (Class != null) {
                console.log(
                  "Failed " +
                    room_id +
                    " is recorded ! on " +
                    new Date().toLocaleDateString("en-In"),
                );
                console.log(error);
                res.send({
                  status: 200,
                  message:
                    room_id +
                    " is recorded ! on " +
                    new Date().toLocaleDateString("en-In"),
                });
              } else {
                res.send({ status: 404, message: "No Class Found !" });
              }
            }
          });
      });
  } else if (event_name == "recording.failed") {
    // let uploadData = JSON.stringify({
    // "title": room_id,
    // "inputs": [
    // {
    // "url": data.raw_path
    // }
    // ],
    // "resolutions": [
    // "240p",
    // "360p",
    // "480p",
    // "720p"
    // ],
    // "enable_drm": true,
    // "folder": "pXCUTCGKH5M"
    // });

    // let config = {
    // method: 'post',
    // maxBodyLength: Infinity,
    // url: 'https://app.tpstreams.com/api/v1/' + process.env.tporg + '/assets/videos/',
    // headers: {
    // "Authorization": "Token " + process.env.tpauth,
    // 'Content-Type': 'application/json'
    // },
    // data: uploadData
    // };
    let uploadData = JSON.stringify({
      headers: { newKey: "New Value" },
      url: data.processed_path,
    });

    let config = {
      method: "post",
      url: "https://video.bunnycdn.com/library/173049/videos/fetch",
      headers: {
        accept: "application/json",
        "content-type": "application/*+json",
        AccessKey: process.env.bunnyAuthKey,
      },
      data: uploadData,
    };
    axios
      .request(config)
      .then((response) => {
        nclass
          .findOneAndUpdate(
            {
              Video_Id: room_id,
            },
            {
              $set: {
                session_id: data.session_id,
                tsid: data._id,
                raw: data.raw_path,
                rec: data.raw_path,
                //tpstreams: response.data.id,
                bunny: response.data.id,
                thumbnail_256x144_path: data.thumbnail_256x144_path,
                thumbnail_path: data.thumbnail_path,
                Duration: data.duration,
              },
            },
            {
              upsert: false,
            },
          )
          .exec(function (err, Class) {
            if (err) {
              res.send({ status: 400, message: err.message });
            } else {
              if (Class != null) {
                res.send({
                  status: 200,
                  message:
                    room_id +
                    " is transcoding ! on " +
                    new Date().toLocaleDateString("en-In"),
                });
              } else {
                res.send({ status: 404, message: "No Class Found !" });
              }
            }
          });
      })
      .catch((error) => {
        nclass
          .findOneAndUpdate(
            {
              Video_Id: room_id,
            },
            {
              $set: {
                Status: "Recorded",
                session_id: data.session_id,
                tsid: data._id,
                raw: data.raw_path,
                rec: data.raw_path,
                thumbnail_256x144_path: data.thumbnail_256x144_path,
                thumbnail_path: data.thumbnail_path,
                Duration: data.duration,
              },
            },
            {
              upsert: false,
            },
          )
          .exec(function (err, Class) {
            if (err) {
              res.send({ status: 400, message: err.message });
            } else {
              if (Class != null) {
                console.log(
                  "Failed " +
                    room_id +
                    " is recorded ! on " +
                    new Date().toLocaleDateString("en-In"),
                );
                res.send({
                  status: 200,
                  message:
                    room_id +
                    " is recorded ! on " +
                    new Date().toLocaleDateString("en-In"),
                });
              } else {
                res.send({ status: 404, message: "No Class Found !" });
              }
            }
          });
      });
  } else if (event_name == "peer.joined") {
    if (data.utype == 2 || data.utype == 3) {
      nclass
        .findOne({ Video_Id: room_id })
        .then(function (Class) {
          var newAttendee = Class.uniqueViews + 1;

          nclass
            .updateOne(
              {
                Video_Id: room_id,
              },
              {
                $set: {
                  uniqueViews: newAttendee,
                },
              },
              {
                upsert: false,
              },
            )
            .exec(function (err, Class) {
              if (err) {
                res.send({ status: 400, message: err.message });
              } else {
                if (Class != null) {
                  res.send({
                    status: 200,
                    message:
                      data.uname +
                      "(" +
                      data.uid +
                      ") joined " +
                      room_id +
                      " ! on " +
                      new Date().toLocaleDateString("en-In"),
                  });
                } else {
                  res.send({ status: 404, message: "No Class Found !" });
                }
              }
            });
        })
        .catch(function (error) {
          res.send({ status: 404, message: error.message });
        });
    } else {
      res.send({ status: 200, message: "Ping Received !" });
    }
  } else if (event_name == "peer.left") {
    if (data.utype == 2 || data.utype == 3) {
      nclass
        .findOne({ Video_Id: room_id })
        .then(function (Class) {
          var newAttendee = Class.uniqueViews - 1;

          nclass
            .updateOne(
              {
                Video_Id: room_id,
              },
              {
                $set: {
                  uniqueViews: newAttendee,
                },
              },
              {
                upsert: false,
              },
            )
            .exec(function (err, Class) {
              if (err) {
                res.send({ status: 400, message: err.message });
              } else {
                if (Class != null) {
                  res.send({
                    status: 200,
                    message:
                      data.uname +
                      "(" +
                      data.uid +
                      ") left " +
                      room_id +
                      " ! on " +
                      new Date().toLocaleDateString("en-In"),
                  });
                } else {
                  res.send({ status: 404, message: "No Class Found !" });
                }
              }
            });
        })
        .catch(function (error) {
          res.send({ status: 404, message: error.message });
        });
    } else {
      res.send({ status: 200, message: "Ping Received !" });
    }
  } else if ((event_name = "whiteboard.new_file_saved")) {
    nclass
      .findOneAndUpdate(
        {
          Video_Id: room_id,
        },
        {
          $set: {
            LiveSlides: data.url,
          },
        },
        {
          upsert: false,
        },
      )
      .exec(function (err, Class) {
        if (err) {
          res.send({ status: 400, message: err.message });
        } else {
          if (Class != null) {
            res.send({
              status: 200,
              message:
                data.filetype +
                " is uploaded ! on " +
                new Date().toLocaleDateString("en-In"),
            });
          } else {
            res.send({ status: 404, message: "No Class Found !" });
          }
        }
      });
  } else {
    res.send({ status: 200, message: "Ping Received !" });
  }
});

app.get("/", (req, res) => {
  res.send("Webhook Endpoint");
});

app.post("/tp", (req, res) => {
  const { video, title } = req.body;
  if (video.status == "Completed") {
    nclass
      .findOneAndUpdate(
        {
          Video_Id: title,
        },
        {
          $set: {
            Status: "Recorded",
          },
        },
        {
          upsert: false,
        },
      )
      .exec(function (err, Class) {
        if (err) {
          res.send({ status: 400, message: err.message });
        } else {
          if (Class != null) {
            res.send({
              status: 200,
              message:
                title +
                " is recorded ! on " +
                new Date().toLocaleDateString("en-In"),
            });
          } else {
            res.send({ status: 404, message: "No Class Found !" });
          }
        }
      });
  } else {
    res.send({ status: 200, message: title + " is " + video.status });
  }
});

app.post("/bunny", (req, res) => {
  const { Status, VideoLibraryId, VideoGuid } = req.body;
  if (Status == 3) {
    nclass
      .findOneAndUpdate(
        {
          bunny: VideoGuid,
        },
        {
          $set: {
            Status: "Recorded",
          },
        },
      )
      .exec(function (err, Class) {
        if (err) {
          res.send({ status: 400, message: err.message });
        } else {
          if (Class != null) {
            res.send({
              status: 200,
              message:
                VideoGuid +
                " is recorded ! on " +
                new Date().toLocaleDateString("en-In"),
            });
          } else {
            res.send({ status: 404, message: "No Class Found !" });
          }
        }
      });
  } else {
    res.send({ status: 200, message: VideoGuid + " is " + Status });
  }
});

app.post("/abhi-bunny", (req, res) => {
  const { Status, VideoLibraryId, VideoGuid } = req.body;
  if (Status == 3) {
    nclass
      .findOneAndUpdate(
        {
          bunny: VideoGuid,
        },
        {
          $set: {
            Status: "Recorded",
          },
        },
      )
      .exec(function (err, Class) {
        if (err) {
          res.send({ status: 400, message: err.message });
        } else {
          if (Class != null) {
            res.send({
              status: 200,
              message:
                VideoGuid +
                " is recorded ! on " +
                new Date().toLocaleDateString("en-In"),
            });
          } else {
            res.send({ status: 404, message: "No Class Found !" });
          }
        }
      });
  } else {
    res.send({ status: 200, message: VideoGuid + " is " + Status });
  }
});

app.post("/ping-bunny", (req, res) => {
  const { Status, VideoLibraryId, VideoGuid } = req.body;
  if (Status == 3) {
    nclass
      .findOneAndUpdate(
        {
          bunny: VideoGuid,
        },
        {
          $set: {
            Status: "Recorded",
            bunnyLibrary: VideoLibraryId,
          },
        },
      )
      .exec(function (err, Class) {
        if (err) {
          res.send({ status: 400, message: err.message });
        } else {
          if (Class != null) {
            res.send({
              status: 200,
              message:
                VideoGuid +
                " is recorded ! on " +
                new Date().toLocaleDateString("en-In"),
            });
          } else {
            res.send({ status: 404, message: "No Class Found !" });
          }
        }
      });
  } else {
    res.send({ status: 200, message: VideoGuid + " is " + Status });
  }
});

module.exports = app;
