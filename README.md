# vue-quill-editor-image-plugin

vue-quill-editor 图片处理插件

# Usage

## Install

```bash
npm i vue-quill-editor-image-plugin
```

## Example


```
<template>
  <div>
      <quill-editor
        v-model="value"
        :options="getEditorOption()"
      >
      </quill-editor>
</template>
<script>
import { quillEditor, Quill } from "vue-quill-editor";
import "quill/dist/quill.core.css";
import "quill/dist/quill.snow.css";
import "quill/dist/quill.bubble.css";

import {
  QuillImagePlugin,
  QuillWatcher,
} from "vue-quill-editor-image-plugin";
export default {
  name: "App",
  data() {
    return {
      value: "",
    };
  },
  components: {
    quillEditor,
  },
  methods: {
    getEditorOption() {
      return {
        modules: {
          QuillImagePlugin: {
            name: "file", // formData.append key
            headers: (xhr) => {
              xhr.setRequestHeader("token", localStorage.getItem("token"));
            }, // 设置上传请求头如token
            action: `${process.env.VUE_APP_API_URL}/upload`, // 上传接口url
            response: (res) => {
              return res.data.url; // 根据接口返回数据结构配置
            },
          },
          toolbar: {
            container: [
              ["bold", "italic", "underline", "strike"], // 加粗 斜体 下划线 删除线
              [{ color: [] }, { background: [] }], // 字体颜色、字体背景颜色
              [{ header: 1 }, { header: 2 }], // 1、2 级标题
              [{ header: [1, 2, 3, 4, 5, 6, false] }], // 标题
              [{ list: "ordered" }, { list: "bullet" }], // 有序、无序列表

              [{ indent: "-1" }, { indent: "+1" }], // 缩进
              [{ align: [] }], // 对齐方式
              ["clean"], // 清除文本格式
              ["image"], // 图片
              // [{ script: "sub" }, { script: "super" }], // 上标/下标
              // [{'direction': 'rtl'}],                         // 文本方向
              // [{ size: ["small", false, "large", "huge"] }], // 字体大小
              // [{ font: [] }], // 字体种类
              // ["blockquote", "code-block"], // 引用  代码块
              // ["link", "image", "video"], // 链接、图片、视频
            ], //工具菜单栏配置
            handlers: {
              image: function () {
                QuillWatcher.emit(this.quill.id, "button");
              },
            },
          },
        },
        placeholder: "请输入",
        readyOnly: false, //是否只读
        theme: "snow", //主题 snow/bubble
        syntax: true, //语法检测
      };
    },
  },
};
</script>
```