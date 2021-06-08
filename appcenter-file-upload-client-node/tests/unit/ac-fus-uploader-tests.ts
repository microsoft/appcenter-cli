import { ACFusNodeUploader } from "../../src/ac-fus-uploader";
import {
  IInitializeSettings,
  ACFusMessageLevel,
  LogProperties,
  IProgress,
  ACFusUploadState,
  ACFusFile,
} from "../../src/ac-fus-uploader-types";
import * as TypeMoq from "typemoq";
import * as assert from "assert";
import * as uuid from "uuid";
import * as Nock from "nock";

class ACFile implements ACFusFile {
  name: string;
  size: number;

  constructor(name: string, filesize: number) {
    this.name = name;
    this.size = filesize;
  }

  slice(start: number, end: number): Buffer {
    throw new Error("Method not implemented.");
  }
}

describe("ACFusUploader", () => {
  describe("#start", () => {
    const onProgressMock = TypeMoq.Mock.ofInstance((_progress: IProgress) => {});
    const onMessageMock = TypeMoq.Mock.ofInstance(
      (_message: string, _properties: LogProperties, _messageLevel: ACFusMessageLevel) => {}
    );
    const onStateChangedMock = TypeMoq.Mock.ofInstance((_state: ACFusUploadState) => {});
    const uploadSettings: IInitializeSettings = {
      assetId: uuid.v4(),
      urlEncodedToken: "encodedToken",
      uploadDomain: "http://upload.ms",
      tenant: "distribution",
      onProgressChanged: onProgressMock.object,
      onMessage: onMessageMock.object,
      onStateChanged: onStateChangedMock.object,
      onCompleted: () => {},
      onResumeRestart: () => {},
    };

    afterEach(() => {
      onProgressMock.reset();
      onMessageMock.reset();
      onStateChangedMock.reset();
    });

    context("When an invalid file is provided", () => {
      it("Should send a message and return when the file is null", () => {
        const setMetadata = Nock("http://upload.ms")
          .post((uri) => uri.includes("set_metadata"))
          .reply(200, "{}");
        const uploader = new ACFusNodeUploader(uploadSettings);
        uploader.start(null);
        onMessageMock.verify(
          (callback) =>
            callback(
              TypeMoq.It.is((message) => message.includes("file must be specified")),
              TypeMoq.It.isAny(),
              TypeMoq.It.isValue(ACFusMessageLevel.Error)
            ),
          TypeMoq.Times.once()
        );
        assert.strictEqual(uploader.uploadData.file, undefined);
        onProgressMock.verify((callback) => callback(TypeMoq.It.isAny()), TypeMoq.Times.never());
        onStateChangedMock.verify((callback) => callback(ACFusUploadState.New), TypeMoq.Times.once());
        onStateChangedMock.verify((callback) => callback(ACFusUploadState.Initialized), TypeMoq.Times.never());
        onStateChangedMock.verify((callback) => callback(ACFusUploadState.Error), TypeMoq.Times.once());
        assert.strictEqual(setMetadata.isDone(), false);
      });

      it("Should send a message and return when the file is empty", () => {
        const setMetadata = Nock("http://upload.ms")
          .post((uri) => uri.includes("set_metadata"))
          .reply(200, "{}");
        const uploader = new ACFusNodeUploader(uploadSettings);
        uploader.start(new ACFile("test", 0));
        onMessageMock.verify(
          (callback) =>
            callback(
              TypeMoq.It.is((message) => message.includes("file must be specified")),
              TypeMoq.It.isAny(),
              TypeMoq.It.isValue(ACFusMessageLevel.Error)
            ),
          TypeMoq.Times.once()
        );
        assert.strictEqual(uploader.uploadData.file, undefined);
        onProgressMock.verify((callback) => callback(TypeMoq.It.isAny()), TypeMoq.Times.never());
        onStateChangedMock.verify((callback) => callback(ACFusUploadState.New), TypeMoq.Times.once());
        onStateChangedMock.verify((callback) => callback(ACFusUploadState.Initialized), TypeMoq.Times.never());
        onStateChangedMock.verify((callback) => callback(ACFusUploadState.Error), TypeMoq.Times.once());
        assert.strictEqual(setMetadata.isDone(), false);
      });
    });

    context("When file is valid", () => {
      let uploader: ACFusNodeUploader;
      const testFile = new ACFile("test1", 100);

      beforeEach(() => {
        uploader = new ACFusNodeUploader(uploadSettings);
        Nock.cleanAll();
      });

      it("Should be initialized and set metadata", () => {
        const setMetadata = Nock("http://upload.ms")
          .post((uri) => uri.includes("set_metadata"))
          .reply(200, "{}");
        uploader.start(testFile);

        assert.strictEqual(uploader.uploadData.file, testFile);
        onProgressMock.verify((callback) => callback(TypeMoq.It.isAny()), TypeMoq.Times.once());
        onStateChangedMock.verify((callback) => callback(ACFusUploadState.New), TypeMoq.Times.once());
        onStateChangedMock.verify((callback) => callback(ACFusUploadState.Initialized), TypeMoq.Times.once());
        setTimeout(() => {
          assert.strictEqual(setMetadata.isDone(), true);
        }, 100);
      });

      context("When the POST to upload/set_metadata fails", () => {
        it("Should log an error message and be in failed state", (done) => {
          Nock.cleanAll();
          Nock("http://upload.ms")
            .post((uri) => uri.includes("set_metadata"))
            .reply(500, "{}")
            .persist();
          uploader.start(testFile);
          setTimeout(function () {
            onMessageMock.verify(
              (callback) =>
                callback(
                  TypeMoq.It.is((message) => message.includes("asset cannot be uploaded")),
                  TypeMoq.It.isAny(),
                  TypeMoq.It.isValue(ACFusMessageLevel.Error)
                ),
              TypeMoq.Times.once()
            );
            assert.strictEqual(uploader.uploadStatus.state, ACFusUploadState.FatalError);
            onStateChangedMock.verify((callback) => callback(ACFusUploadState.FatalError), TypeMoq.Times.once());
            done();
          }, 100);
        });
      });

      context("When the POST to upload/set_metadata succeeds", () => {
        context("When getting an html document or non-JSON response back", () => {
          it("Should strip off everything outside the body tags and log an error and be in failed state", (done) => {
            Nock.cleanAll();
            const request = Nock("http://upload.ms").post(/.*/).reply(200, "<!DOCTYPE html><html></html>").persist();
            uploader.start(testFile);
            setTimeout(function () {
              onMessageMock.verify(
                (callback) =>
                  callback(
                    TypeMoq.It.is((message) => message.includes("asset cannot be uploaded")),
                    TypeMoq.It.isObjectWith({ fileName: testFile.name, fileSize: testFile.size, StatusCode: 200 }),
                    TypeMoq.It.isValue(ACFusMessageLevel.Error)
                  ),
                TypeMoq.Times.once()
              );
              assert.strictEqual(uploader.uploadStatus.state, ACFusUploadState.FatalError);
              onProgressMock.verify((callback) => callback(TypeMoq.It.isAny()), TypeMoq.Times.once());
              onStateChangedMock.verify((callback) => callback(ACFusUploadState.New), TypeMoq.Times.once());
              onStateChangedMock.verify((callback) => callback(ACFusUploadState.Initialized), TypeMoq.Times.once());
              onStateChangedMock.verify((callback) => callback(ACFusUploadState.FatalError), TypeMoq.Times.once());
              assert.strictEqual(request.isDone(), true);
              done();
            }, 500);
          });
        });
      });

      context("When file is already being uploaded", () => {
        it("Should emit a warning and return without updating the file", () => {
          Nock.cleanAll();
          Nock("http://upload.ms").post(/.*/).reply(200, "{}");
          uploader.start(testFile);
          uploader.start(new ACFile("test2", 200));
          onMessageMock.verify(
            (callback) =>
              callback(
                TypeMoq.It.is((message) => message.includes("already in progress")),
                TypeMoq.It.isAny(),
                TypeMoq.It.isValue(ACFusMessageLevel.Error)
              ),
            TypeMoq.Times.once()
          );
          assert.strictEqual(uploader.uploadData.file, testFile);
          onProgressMock.verify((callback) => callback(TypeMoq.It.isAny()), TypeMoq.Times.once());
          onStateChangedMock.verify((callback) => callback(ACFusUploadState.New), TypeMoq.Times.once());
          onStateChangedMock.verify((callback) => callback(ACFusUploadState.Initialized), TypeMoq.Times.once());
          onStateChangedMock.verify((callback) => callback(ACFusUploadState.FatalError), TypeMoq.Times.never());
          setTimeout(() => {
            assert.strictEqual(Nock.isDone(), true);
          }, 100);
        });
      });
    });
  });
});
