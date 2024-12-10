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
    quill.root.addEventListener("paste", this.handlePaste.bind(this), false);
    this.cursorIndex = 0;
    QuillWatcher.on(this.id, this);
  }

  // 通过类型返回item
  getItemByKindType(items, kind, type) {
    console.log("getItemByKindType", items, kind);
    let item = null;
    for (let i = 0; i < items.length; i++) {
      console.log("items[i]", items[i]);
      if (kind == "file" && items[i].kind == kind) {
        item = items[i];
        break;
      }
      if (kind == "string" && type && items[i].type == type) {
        item = items[i];
        break;
      }
    }
    console.log("getItemByKindType item", item);
    return item;
  }

  htmlToPlainText(html) {
    // 创建一个临时的 DOM 元素
    var tempDiv = document.createElement("div");
    // 将 HTML 设置为临时元素的内容
    tempDiv.innerHTML = html;
    // 使用 textContent 获取纯文本
    return tempDiv.textContent || tempDiv.innerText || "";
  }

  // 剪切板处理方法
  handlePaste(e) {
    QuillWatcher.emit(this.quill.id, "paste");
    let clipboardData = e.clipboardData;
    console.log("clipboardData", clipboardData);

    if (clipboardData) {
      let types = clipboardData.types;
      console.log("types", types);
      // 常见的types
      // ['text/html', 'Files'] 选中网页中一张图片复制
      // ['text/plain', 'text/html'] 网页中的图文混合
      // ['Files'] 截图
      // ['text/plain', 'text/html', 'vscode-editor-data'] vscode中复制内容
      // ['text/plain', 'text/html', 'text/rtf', 'Files'] mac word复制内容

      // 常见的kind
      // string 、 file

      let items = clipboardData.items;
      console.log("items", items);
      // console.log("items[0]", items[0]);
      // console.log("items[1]", items[1]);
      let item = null;
      // item取值逻辑
      // 1. 优先取Files
      // 2. 其次取text/plain 如果 text/plain 中有图片为base64过滤掉
      // 3. 最后取text/html

      if (types.includes("Files") && !types.includes("text/rtf")) {
        item = this.getItemByKindType(items, "file");
        if (item && item.kind === "file" && item.type.match(/^image\//i)) {
          // 图片类型屏蔽默认事件（base64图片）
          e.preventDefault();
          this.file = item.getAsFile();
          if (this.config.action) {
            this.handleUpload();
          } else {
            this.toBase64();
          }
        }
      }
      // else if (types.includes("text/plain") && types.includes("text/html")) {
      //   e.preventDefault();
      //   // console.log("event e", e);
      //   let itemHtml = this.getItemByKindType(items, "string", "text/html");
      //   let itemPlain = this.getItemByKindType(items, "string", "text/plain");
      //   console.log("itemPlain", itemPlain);
      //   if (
      //     itemHtml &&
      //     itemHtml.kind === "string" &&
      //     itemHtml.type == "text/html"
      //   ) {
      //     itemHtml.getAsString((str) => {
      //       console.log("str", str);
      //       // 判断是否为BASE64图片
      //       if (str.match(/data:image\/.*?;base64/)) {
      //         // 过滤BASE64图片后插入内容
      //         str = str.replace(
      //           /<img.*?src="(data:image\/.*?;base64.*?)".*?>/g,
      //           ""
      //         );
      //       }
      //       this.insertHtml(str);
      //     });
      //   }
      // }
      // console.log("QuillWatcher.active.quill", QuillWatcher.active.quill);
      // console.log(
      //   "QuillWatcher.active.quill.editor.delta.ops",
      //   QuillWatcher.active.quill.editor.delta.ops
      // );
      // QuillWatcher.active.quill.editor.delta.ops.forEach((item, index) => {
      //   if (item.insert && item.insert.image) {
      //     // 过滤BASE64图片后插入内容
      //   }
      // });

      // console.log("item", item);
    }
  }

  toBase64() {
    const reader = new FileReader();
    reader.onload = (e) => {
      this.resUrl = e.target.result;
      this.insertImage();
    };
    reader.readAsDataURL(this.file);
  }

  // 上传请求
  handleUpload() {
    console.log("handleUpload");
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
  insertImage(url) {
    console.log(
      "QuillWatcher.active.cursorIndex",
      QuillWatcher.active.cursorIndex
    );
    QuillWatcher.active.quill.insertEmbed(
      QuillWatcher.active.cursorIndex,
      "image",
      url || QuillWatcher.active.resUrl
    );
    setTimeout(() => {
      QuillWatcher.active.quill.setSelection(
        QuillWatcher.active.cursorIndex + 1
      );
    }, 0);
  }
  // 向富文本插入text
  insertText(str) {
    QuillWatcher.active.quill.insertText(QuillWatcher.active.cursorIndex, str);
    setTimeout(() => {
      QuillWatcher.active.quill.setSelection(
        QuillWatcher.active.cursorIndex + 1
      );
    }, 0);
  }

  // 向富文本插入html
  insertHtml(str) {
    console.log("QuillWatcher.active.cursorIndex", QuillWatcher.active);
    QuillWatcher.active.quill.clipboard.dangerouslyPasteHTML(
      QuillWatcher.active.cursorIndex,
      str
    );
    setTimeout(() => {
      QuillWatcher.active.quill.setSelection(
        QuillWatcher.active.cursorIndex + 1
      );
    }, 0);
  }

  // 上传处理相关

  onloadstart() {
    // 修复剪切板光标错误问题
    QuillWatcher.active.cursorIndex =
      QuillWatcher.active.quill.getSelection(true).index;
    QuillWatcher.active.quill.insertText(
      QuillWatcher.active.cursorIndex,
      "[上传中...]",
      { color: "red" },
      true
    );
  }

  onprogress(pro) {
    pro = "[" + "上传中" + pro + "]";
    QuillWatcher.active.quill.root.innerHTML =
      QuillWatcher.active.quill.root.innerHTML.replace(/\[上传中.*?\]/, pro);
  }

  onuploaderror(msg) {
    QuillWatcher.active.quill.root.innerHTML =
      QuillWatcher.active.quill.root.innerHTML.replace(
        /\[上传中.*?\]/,
        msg ? "[" + msg + "]" : "[上传错误]"
      );
  }

  onuploadsuccess() {
    QuillWatcher.active.quill.root.innerHTML =
      QuillWatcher.active.quill.root.innerHTML.replace(/\[上传中.*?\]/, "");
  }
}

// 上传按钮点击处理
export function handleImageButtion() {
  console.log("handleImageButtion");
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
