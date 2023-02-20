export const QuillWatcher = {
  watcher: {},
  active: null,
  on: function (id, plugin) {
    if (!this.watcher[id]) {
      this.watcher[id] = plugin;
    }
  },
  emit: function (id, type = "button") {
    this.active = this.watcher[id];
    // 类型默认为按钮点击上传
    if (type == "button") {
      handleImageButtion();
    }
  },
};

export class QuillImagePlugin {
  constructor(quill, config = {}) {
    this.id = Math.random();
    this.quill = quill;
    this.quill.id = this.id;
    this.config = config;
    this.file = "";
    this.resUrl = "";
    // 剪切板粘贴事件监听
    // quill.root.addEventListener("paste", this.handlePaste.bind(this), false);
    this.cursorIndex = 0;
    QuillWatcher.on(this.id, this);
  }
  // TODO: 剪切板bug待修复
  handlePaste(e) {
    QuillWatcher.emit(this.quill.id, "paste");
    let clipboardData = e.clipboardData;
    let i = 0;
    let items, item, types;
    if (clipboardData) {
      items = clipboardData.items;
      if (!items) {
        return;
      }
      item = items[0];
      types = clipboardData.types || [];
      for (; i < types.length; i++) {
        if (types[i] === "Files") {
          item = items[i];
          break;
        }
      }
      if (item && item.kind === "file" && item.type.match(/^image\//i)) {
        this.file = item.getAsFile();
        if (this.config.action) {
          this.handleUpload();
        } else {
          this.toBase64();
        }
      }
    }
  }

  toBase64() {
    const reader = new FileReader();
    reader.onload = (e) => {
      // 返回base64
      this.resUrl = e.target.result;
      this.insertImage();
    };
    reader.readAsDataURL(this.file);
  }

  // TODO: 集成暴露配置还是暴露在组件之外？
  handleUpload() {
    let config = this.config;
    let formData = new FormData();
    formData.append(config.name, this.file);
    let xhr = new XMLHttpRequest();
    xhr.open("post", config.action, true);
    if (config.headers) {
      config.headers(xhr);
    }
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          let res = JSON.parse(xhr.responseText);
          if (res.code != 200) {
            QuillWatcher.active.onuploaderror(res.msg);
            return;
          }
          this.resUrl = config.response(res);
          QuillWatcher.active.onuploadsuccess();
          this.insertImage();
        } else {
          QuillWatcher.active.onuploaderror();
        }
      }
    };
    // 开始上传
    xhr.upload.onloadstart = function () {
      QuillWatcher.active.onloadstart();
    };
    // 上传进程
    xhr.upload.onprogress = function (e) {
      let complete = (((e.loaded / e.total) * 100) | 0) + "%";
      QuillWatcher.active.onprogress(complete);
    };
    // 上传错误
    xhr.upload.onerror = function () {
      QuillWatcher.active.onuploaderror();
    };
    // 上传结束
    xhr.upload.onloadend = function () {};
    xhr.send(formData);
  }
  // 向富文本插入图片
  insertImage() {
    QuillWatcher.active.quill.insertEmbed(
      QuillWatcher.active.cursorIndex,
      "image",
      QuillWatcher.active.resUrl
    );
    QuillWatcher.active.quill.update();
    QuillWatcher.active.quill.setSelection(QuillWatcher.active.cursorIndex + 1);
  }

  // 上传处理相关

  onloadstart() {
    let length =
      (QuillWatcher.active.quill.getSelection() || {}).index ||
      QuillWatcher.active.quill.getLength();
    QuillWatcher.active.cursorIndex = length;
    QuillWatcher.active.quill.insertText(
      QuillWatcher.active.cursorIndex,
      "[uploading...]",
      { color: "red" },
      true
    );
  }

  onprogress(pro) {
    pro = "[" + "uploading" + pro + "]";
    QuillWatcher.active.quill.root.innerHTML =
      QuillWatcher.active.quill.root.innerHTML.replace(/\[uploading.*?\]/, pro);
  }

  onuploaderror(msg) {
    QuillWatcher.active.quill.root.innerHTML =
      QuillWatcher.active.quill.root.innerHTML.replace(
        /\[uploading.*?\]/,
        msg || "[upload error]"
      );
  }

  onuploadsuccess() {
    QuillWatcher.active.quill.root.innerHTML =
      QuillWatcher.active.quill.root.innerHTML.replace(/\[uploading.*?\]/, "");
  }
}

// 上传按钮点击处理
export function handleImageButtion() {
  let fileInput = document.querySelector(".quill-image-input");
  if (fileInput === null) {
    fileInput = document.createElement("input");
    fileInput.setAttribute("type", "file");
    fileInput.classList.add("quill-image-input");
    fileInput.style.display = "none";
    // 监听选择文件
    fileInput.addEventListener("change", () => {
      QuillWatcher.active.file = fileInput.files[0];
      fileInput.value = "";
      if (QuillWatcher.active.config.action) {
        QuillWatcher.active.handleUpload();
      } else {
        QuillWatcher.active.toBase64();
      }
    });
    document.body.appendChild(fileInput);
  }
  fileInput.click();
}
