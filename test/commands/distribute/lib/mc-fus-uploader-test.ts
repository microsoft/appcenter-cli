import { McFusNodeUploader } from "../../../../src/commands/distribute/lib/mc-fus-uploader/mc-fus-uploader";
import {
  IInitializeSettings,
  McFusMessageLevel,
  LogProperties,
  IProgress,
  McFusUploadState,
  McFusFile,
} from "../../../../src/commands/distribute/lib/mc-fus-uploader/mc-fus-uploader-types";
import * as TypeMoq from "typemoq";
import * as assert from "assert";
import * as uuid from "uuid";
import * as Nock from "nock";

class McFile implements McFusFile {
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

describe("McFusUploader", () => {
  describe("#start", () => {
    const onProgressMock = TypeMoq.Mock.ofInstance((_progress: IProgress) => {});
    const onMessageMock = TypeMoq.Mock.ofInstance(
      (_message: string, _properties: LogProperties, _messageLevel: McFusMessageLevel) => {}
    );
    const onStateChangedMock = TypeMoq.Mock.ofInstance((_state: McFusUploadState) => {});
    const uploadDomain = "http://upload.ms";
    const uploadSettings: IInitializeSettings = {
      assetId: uuid.v4(),
      urlEncodedToken: "encodedToken",
      uploadDomain: uploadDomain,
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
        const setMetadata = Nock(uploadDomain)
          .post((uri) => uri.includes("set_metadata"))
          .reply(200, "{}");
        const uploader = new McFusNodeUploader(uploadSettings);
        uploader.start(null);
        onMessageMock.verify(
          (callback) =>
            callback(
              TypeMoq.It.is((message) => message.includes("file must be specified")),
              TypeMoq.It.isAny(),
              TypeMoq.It.isValue(McFusMessageLevel.Error)
            ),
          TypeMoq.Times.once()
        );
        assert.strictEqual(uploader.uploadData.file, undefined);
        onProgressMock.verify((callback) => callback(TypeMoq.It.isAny()), TypeMoq.Times.never());
        onStateChangedMock.verify((callback) => callback(McFusUploadState.New), TypeMoq.Times.once());
        onStateChangedMock.verify((callback) => callback(McFusUploadState.Initialized), TypeMoq.Times.never());
        onStateChangedMock.verify((callback) => callback(McFusUploadState.Error), TypeMoq.Times.once());
        assert.strictEqual(setMetadata.isDone(), false);
      });

      it("Should send a message and return when the file is empty", () => {
        const setMetadata = Nock(uploadDomain)
          .post((uri) => uri.includes("set_metadata"))
          .reply(200, "{}");
        const uploader = new McFusNodeUploader(uploadSettings);
        uploader.start(new McFile("test", 0));
        onMessageMock.verify(
          (callback) =>
            callback(
              TypeMoq.It.is((message) => message.includes("file must be specified")),
              TypeMoq.It.isAny(),
              TypeMoq.It.isValue(McFusMessageLevel.Error)
            ),
          TypeMoq.Times.once()
        );
        assert.strictEqual(uploader.uploadData.file, undefined);
        onProgressMock.verify((callback) => callback(TypeMoq.It.isAny()), TypeMoq.Times.never());
        onStateChangedMock.verify((callback) => callback(McFusUploadState.New), TypeMoq.Times.once());
        onStateChangedMock.verify((callback) => callback(McFusUploadState.Initialized), TypeMoq.Times.never());
        onStateChangedMock.verify((callback) => callback(McFusUploadState.Error), TypeMoq.Times.once());
        assert.strictEqual(setMetadata.isDone(), false);
      });
    });

    context("When file is valid", () => {
      let uploader: McFusNodeUploader;
      const testFile = new McFile("test1", 100);

      beforeEach(() => {
        uploader = new McFusNodeUploader(uploadSettings);
        Nock.cleanAll();
      });

      it("Should be initialized and set metadata", (done) => {
        const setMetadata = Nock(uploadDomain)
          .post((uri) => uri.includes("set_metadata"))
          .reply(200, "{}")
          .persist();
        uploader.start(testFile);
        setTimeout(function () {
          assert.strictEqual(uploader.uploadData.file, testFile);
          onProgressMock.verify((callback) => callback(TypeMoq.It.isAny()), TypeMoq.Times.exactly(3));
          onStateChangedMock.verify((callback) => callback(McFusUploadState.New), TypeMoq.Times.once());
          onStateChangedMock.verify((callback) => callback(McFusUploadState.Initialized), TypeMoq.Times.once());
          assert.strictEqual(setMetadata.isDone(), true);
          done();
        }, 500);
      });

      context("When the POST to upload/set_metadata fails", () => {
        it("Should log an error message and be in failed state", (done) => {
          Nock(uploadDomain)
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
                  TypeMoq.It.isValue(McFusMessageLevel.Error)
                ),
              TypeMoq.Times.once()
            );
            assert.strictEqual(uploader.uploadStatus.state, McFusUploadState.FatalError);
            onStateChangedMock.verify((callback) => callback(McFusUploadState.FatalError), TypeMoq.Times.once());
            done();
          }, 200);
        });
      });

      context("When the POST to upload/set_metadata succeeds", () => {
        context("When getting an html document or non-JSON response back", () => {
          it("Should strip off everything outside the body tags and log an error and be in failed state", (done) => {
            const request = Nock(uploadDomain).post(/.*/).reply(200, "<!DOCTYPE html><html></html>").persist();
            uploader.start(testFile);
            setTimeout(function () {
              onMessageMock.verify(
                (callback) =>
                  callback(
                    TypeMoq.It.is((message) => message.includes("asset cannot be uploaded")),
                    TypeMoq.It.isObjectWith({ fileName: testFile.name, fileSize: testFile.size, StatusCode: 200 }),
                    TypeMoq.It.isValue(McFusMessageLevel.Error)
                  ),
                TypeMoq.Times.once()
              );
              assert.strictEqual(uploader.uploadStatus.state, McFusUploadState.FatalError);
              onProgressMock.verify((callback) => callback(TypeMoq.It.isAny()), TypeMoq.Times.once());
              onStateChangedMock.verify((callback) => callback(McFusUploadState.New), TypeMoq.Times.once());
              onStateChangedMock.verify((callback) => callback(McFusUploadState.Initialized), TypeMoq.Times.once());
              onStateChangedMock.verify((callback) => callback(McFusUploadState.FatalError), TypeMoq.Times.once());
              assert.strictEqual(request.isDone(), true);
              done();
            }, 500);
          });
        });
      });

      context("When file is already being uploaded", () => {
        it("Should emit a warning and return without updating the file", (done) => {
          Nock(uploadDomain).post(/.*/).reply(200, "{}");
          uploader.start(testFile);
          uploader.start(new McFile("test2", 200));
          setTimeout(function () {
            onMessageMock.verify(
              (callback) =>
                callback(
                  TypeMoq.It.is((message) => message.includes("already in progress")),
                  TypeMoq.It.isAny(),
                  TypeMoq.It.isValue(McFusMessageLevel.Error)
                ),
              TypeMoq.Times.once()
            );

            assert.strictEqual(uploader.uploadData.file, testFile);
            onProgressMock.verify((callback) => callback(TypeMoq.It.isAny()), TypeMoq.Times.exactly(3));
            onStateChangedMock.verify((callback) => callback(McFusUploadState.New), TypeMoq.Times.once());
            onStateChangedMock.verify((callback) => callback(McFusUploadState.Initialized), TypeMoq.Times.once());
            onStateChangedMock.verify((callback) => callback(McFusUploadState.FatalError), TypeMoq.Times.never());
            assert.strictEqual(Nock.isDone(), true);
            done();
          }, 500);
        });
      });
    });
  });
});
