let Module$1 = {};
window.Module = Module$1;
let wasmLoader = async function (config) {
    if (!config.el || typeof config.el != "object") {
        throw new Error("挂载元素不能为空");
    }
    let canvas = document.createElement("canvas");
    canvas.id = "qtcanvas";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.oncontextmenu = function (e) {
        e.preventDefault();
    };
    config.el.appendChild(canvas);
    config.canvas = canvas;
    if (config.path === undefined) {
        config.path = "assets";
    }
    if (config.path.length > 0 && !config.path.endsWith("/")) {
        config.path = config.path.concat("/");
    }

    loadEmscriptenModule("teramap");

    function fetchResource(filePath) {
        let fullPath = config.path + filePath;
        return fetch(fullPath).then(function (response) {
            if (response.ok) {
                return response;
            }
        });
    }

    function fetchText(filePath) {
        return fetchResource(filePath).then(function (response) {
            return response.text();
        });
    }

    function fetchThenCompileWasm(response) {
        return response.arrayBuffer().then(function (data) {
            return WebAssembly.compile(data);
        });
    }

    function fetchCompileWasm(filePath) {
        return fetchResource(filePath).then(function (response) {
            if (typeof WebAssembly.compileStreaming !== "undefined") {
                return WebAssembly.compileStreaming(response).catch(function (
                    error
                ) {
                    return fetchThenCompileWasm(response);
                });
            } else {
                return fetchThenCompileWasm(response);
            }
        });
    }

    async function loadEmscriptenModule(applicationName) {
        let emscriptenModuleSource = await fetchText(applicationName + ".js");
        let wasmModule = await fetchCompileWasm(applicationName + ".wasm");
        completeLoadEmscriptenModule(emscriptenModuleSource, wasmModule);
    }

    function completeLoadEmscriptenModule(emscriptenModuleSource, wasmModule) {
        Module$1.instantiateWasm = function (imports, successCallback) {
            WebAssembly.instantiate(wasmModule, imports).then(function (
                instance
            ) {
                successCallback(instance, wasmModule);
            });
            return {};
        };
        Module$1.locateFile =
            Module$1.locateFile ||
            function (filename) {
                return config.path + filename;
            };
        Module$1.print =
            Module$1.print ||
            function (text) {
                if (config.stdoutEnabled) console.log(text);
            };
        Module$1.printErr =
            Module$1.printErr ||
            function (text) {
                if (
                    text.startsWith !== undefined &&
                    text.startsWith("bad name in getProcAddress:")
                ) {
                    return;
                }
                if (config.stderrEnabled) console.log(text);
            };

        Module$1.mainScriptUrlOrBlob = new Blob([emscriptenModuleSource], {
            type: "text/javascript",
        });
        Module$1.qtCanvasElements = [config.canvas];
        self.eval(emscriptenModuleSource);
    }

    let GlobalViewer = await new Promise((revsole) => {
        window.initScene = function () {
            let Li = window.Li;
            let url = window.location.href;
            for (const key in Li) {
                if (Object.hasOwnProperty.call(Li, key)) {
                    SSmap$1[key] = Li[key];
                }
            }
            window.GlobalViewer.canvasEl = canvas;
            SSmap$1.extend(Li, window.GlobalViewer);
            SSmap$1.$baseUrl = url.substring(0, url.lastIndexOf("/"));
            window.SSmap = SSmap$1;
            revsole([Li, window.GlobalViewer]);
        };
    });
    return GlobalViewer;
};

let list = [];

let SSmap$1 = {};

SSmap$1.init = wasmLoader;
SSmap$1.use = function (modules) {
    list.push(modules);
};
SSmap$1.extend = function (Li, GlobalViewer) {
    for (let i = 0; i < list.length; i++) {
        bind(SSmap$1, list[i]);
    }
    function bind(target, module) {
        for (const key in module) {
            if (typeof module[key] == "function") {
                target[key] = module[key](Li, GlobalViewer);
            } else {
                target[key] = bind({}, module[key]);
            }
        }
        return target;
    }
};

//纬度差转米
function LatitudeToMeters(latDiff) {
    return latDiff / 0.000000157891;
}
//经度差转米
function LongitudeToMeters(lonDiff, lat) {
    return (lonDiff / 0.000000156785) * Math.cos(lat);
}
//角度转弧度
function AngleToRadian(angle) {
    return (Math.PI / 180) * angle;
}
//弧度转角度
function RadianToAngle(radian) {
    return (180 / Math.PI) * radian;
}

function global$x(Li, viewer) {
    function flyTo(destination, opt) {
        opt = opt || {};
        let cameraController = viewer.scene.mainCamera.cameraController();
        if (destination instanceof Li.Vector3) {
            cameraController.flyTo(
                destination,
                Number(opt.duration) || 3,
                Number(opt.heading) || 0,
                Number(opt.pitch) || -90,
                Number(opt.roll) || 0
            );
        } else if (destination instanceof Li.Cartographic) {
            cameraController.flyToCartographic(
                destination,
                Number(opt.duration) || 3,
                Number(opt.heading) || 0,
                Number(opt.pitch) || -90,
                Number(opt.roll) || 0
            );
        } else if (destination instanceof Li.Cartesian3 && opt.duration) {
            cameraController.flyTo(
                destination.toVector3(),
                Number(opt.duration) || 3,
                Number(opt.heading) || 0,
                Number(opt.pitch) || -90,
                Number(opt.roll) || 0
            );
        } else if (
            (destination instanceof Li.Cartesian3 ||
                destination instanceof Li.Cartographic ||
                destination instanceof Li.Vector3) &&
            (!opt.duration || opt.duration == 0)
        ) {
            let nowdestination = null;
            if (destination instanceof Li.Cartesian3) {
                nowdestination = destination;
            } else if (destination instanceof Li.Cartographic) {
                nowdestination = destination.toCartesian3();
            } else if (destination instanceof Li.Vector3) {
                nowdestination = destination.toCartesian3();
            }
            cameraController.setView(
                nowdestination,
                Number(AngleToRadian(opt.heading || 0)),
                Number(AngleToRadian(opt.pitch || -90)),
                Number(AngleToRadian(opt.roll || 0))
            );
        } else if (destination instanceof Li.Rectangle) {
            if (!opt.locaterect) {
                cameraController.flyToRectangle(
                    destination,
                    Number(opt.duration) || 0,
                    Number(opt.heading) || 0,
                    Number(opt.pitch) || -90,
                    Number(opt.roll) || 0
                );
            } else {
                let bounds = destination.bounds();
                if (bounds) {
                    let Cartographic = bounds.center
                        .toCartesian3()
                        .toCartographic();
                    let height = bounds.radius <= 0 ? 1 : bounds.radius;
                    _flyToredraw(Cartographic, height, opt);
                }
            }
        } else if (destination instanceof Li.Model) {
            flyToEntity(destination, opt);
        } else if (destination instanceof SSmap.ModelEntity) {
            flyToEntity(destination, opt);
        } else if (destination instanceof Li.Tileset) {
            flyToTileset(destination, opt);
        } else if (destination instanceof Li.TilesetLayer) {
            destination = destination.Tileset();
            flyToTileset(destination, opt);
        } else if (destination instanceof SSmap.Tiles3dLayer) {
            flyToTileset(destination, opt);
        } else if (
            destination instanceof Li.BillboardEntity ||
            destination instanceof Li.Label3D
        ) {
            let position = destination.position; //被观察点
            let target = _vector3Offset(position, {
                offsetY: -120,
                offsetZ: 160,
            }); //观察点
            _addBillboard("point", target);
            let nowPitch = Li.GisUtil.getPitch(target, position); //两点之间的俯仰角度
            let nowheading = Li.GisUtil.getHeading(target, position); //两点之间的旋转角度
            let newpitch = RadianToAngle(nowPitch);
            let newheading = RadianToAngle(nowheading);
            flyTo(target, {
                duration: Number(opt.duration) || 0,
                heading: Number(newheading) || 0,
                pitch: Number(newpitch) || -89,
                roll: Number(opt.roll) || 0,
            });
        }

        //剩下数组类型
    }
    function flyToTileset(Tiles, opt) {
        let bounds = Tiles.bounds;
        if (bounds) {
            let Cartographic = Tiles.center;
            let height = bounds.radius <= 0 ? 1 : bounds.radius;
            _flyToredraw(Cartographic, height, opt);
        }
    }
    function flyToEntity(model, opt) {
        opt = opt || {};
        let renderer = model.renderer;
        if (renderer) {
            if (renderer instanceof Li.GeometryRenderer) {
                let center = renderer.boundingVolume.center
                    .toCartesian3()
                    .toCartographic(); //中心点
                let boundingSphere = renderer.boundingVolume.boundingSphere;
                _flyTomredraw(center, boundingSphere.radius);
            }
        } else if (opt.center) {
            if (opt.center instanceof Li.Cartographic) {
                flyTo(opt.center, {
                    duration: Number(opt.duration) || 0,
                    heading: Number(opt.heading) || 0,
                    pitch: Number(-newpitch) || -45,
                    roll: Number(opt.roll) || 0,
                });
            } else {
                console.error("parametererror：", "center不是Cartographic类型");
            }
        }
    }
    function _flyTomredraw(Cartographic, height, opt) {
        opt = opt || {};
        if (Cartographic && height) {
            Cartographic.height = Cartographic.height + 2.5 * height;
            let position = Cartographic.toVector3();
            position = _vector3Offset(position, {
                offsetY: -2.5 * height,
            });
            flyTo(position, {
                duration: Number(opt.duration) || 0,
                heading: Number(opt.heading) || 0,
                pitch: Number(opt.pitch) || -45,
                roll: Number(opt.roll) || 0,
            });
        }
    }

    //根据半径或高度 获取偏移后的坐标
    function _offsetToposition(Cartographic, height, opt) {
        opt = opt || {};
        let nowpitch = Math.abs(opt.pitch || -45);
        let newpitch = null;
        if (nowpitch % 90 == 0 && nowpitch != 0) {
            newpitch = 90;
        } else if (nowpitch % 90 <= 34) {
            newpitch = 34;
        } else {
            newpitch = nowpitch % 90; //默认-45度
        }
        let multiple = Math.abs(((newpitch / 0.01) * 0.00023).toFixed(2));
        Cartographic.height = multiple * height; //0.00023=0.01度
        //Cartographic.height = Math.sin(AngleToRadian(Number(-opt.pitch))) * height;
        let nowposition = Cartographic.toVector3();
        let multipleone = Number((multiple - 2.15).toFixed(2));
        nowposition = _vector3Offset(nowposition, {
            //offsetY: Math.cos(AngleToRadian(Number(opt.pitch))) * height,
            offsetY: multipleone * height,
        });
        return nowposition;
    }

    //重新飞行定位
    function _flyToredraw(Cartographic, height, opt) {
        let nowposition = _offsetToposition(Cartographic, height, opt);

        flyTo(nowposition, {
            duration: Number(opt.duration) || 0,
            heading: Number(opt.heading) || 0,
            pitch: Number(opt.pitch) || -45,
            roll: Number(opt.roll) || 0,
        });
    }

    function _vector3Offset(point, { offsetX = 0, offsetY = 0, offsetZ = 0 }) {
        if (viewer) {
            let vec3 = SSmap.Vector3.create(offsetX, offsetY, offsetZ);
            let localToWorld =
                viewer.scene.globe.ellipsoid.eastNorthUpToFixedFrame(
                    point.toCartesian3()
                );
            let newPoint = SSmap.Matrix4.multiplyByVector3(localToWorld, vec3);
            return newPoint;
        }
    }
    //临时添加的
    function _addBillboard(name, point) {
        // var billboards = Li.BillboardCollection.Instance();
        // billboards.removeAll();
        window.bbEntity = new Li.BillboardEntity();
        window.bbEntity.position = point;
        window.bbEntity.url = SSmap.$baseUrl + "/assets/images/circle.png";
        window.bbEntity.vertical = true;
        window.bbEntity.imageWidth = 10;
        window.bbEntity.imageHeight = 10;
        if (name) {
            window.bbEntity.objectName = name;
        }
        window.bbEntity.setCollection(Li.BillboardCollection.Instance());
    }
    return flyTo;
}

function global$w(Li, viewer) {
    function EventHandler(v, e) {
        this._canvas = e || Module.qtCanvasElements[0];
        this._canvas._inputEvents = {};
        this._viewer = viewer || v;
    }
    //设置事件监听
    EventHandler.prototype.setInputAction = function (events, type, modifier) {
        this._canvas.style.cursor = "crosshair";
        if (events === undefined && events === null) {
            console.error("events is required.");
        }
        if (type === undefined && type === null) {
            console.error("type is required.");
        }
        var key = this._getInputEventKey(type, modifier);
        this._difftype(type, key);
        this._canvas._inputEvents[key] = events;
        this._canvas.dbclicknum = 0;
    };

    EventHandler.prototype._difftype = function (type, key) {
        var that = this;
        this._canvas.option = {
            position: {
                flatposition: null, ////屏幕坐标
                Cartesian3: null, //笛卡尔坐标
                lonlatlocaltion: null, //经纬度
            },
            primitive: {
                Tilesetinfo: null, //3dTileset模型
                entity: null, //实体
            },
        };
        switch (type) {
            case 0:
                this._canvas.addEventListener(
                    "mousedown",
                    that._ceatemousedownEvent
                );
                break;
            case 1:
                this._canvas.addEventListener(
                    "mouseup",
                    that._ceatemouseupEvent
                );
                break;
            case 2:
                this._canvas.addEventListener(
                    "click",
                    that._ceateLeftclickEvent
                );
                break;
            case 3:
                this._canvas.addEventListener(
                    "dblclick",
                    that._ceateLeftdblclickEvent
                );
                break;
            case 5:
                this._canvas.addEventListener(
                    "mousedown",
                    that._ceatemousedownEvent
                );
                break;
            case 6:
                this._canvas.addEventListener(
                    "mouseup",
                    that._ceatemouseupEvent
                );
                break;
            case 7:
                this._canvas.addEventListener(
                    "contextmenu",
                    that._ceateRightclickEvent
                );
                break;
            case 8:
                this._canvas.addEventListener(
                    "contextmenu",
                    that._ceateRightdblclickEvent
                );
                break;
            case 9:
                this._canvas.addEventListener(
                    "mousedown",
                    that._ceatemousedownEvent
                );
                break;
            case 10:
                this._canvas.addEventListener(
                    "mouseup",
                    that._ceatemouseupEvent
                );
                break;
            case 15:
                //鼠标移动
                this._canvas.addEventListener(
                    "mousemove",
                    that._ceatemousemoveEvent
                );
                break;
            case 16:
                //鼠标滚轮
                this._canvas.addEventListener("wheel", that._ceatewheelEvent);
                break;
        }
    };

    //注册鼠标左键单击事件并回调
    EventHandler.prototype._ceateLeftclickEvent = function (e) {
        if (viewer.scene == undefined) return;
        if (e.button == 0) {
            let optmove = EventHandler.prototype._getraycastInfo(e);
            //回调函数
            this._inputEvents[EventHandler.prototype.EventType.LEFT_CLICK](
                optmove
            );
        }
    };
    //注册鼠标右键单击事件
    EventHandler.prototype._ceateRightclickEvent = function (e) {
        if (viewer.scene == undefined) return;
        if (e.button == 2) {
            let optmove = EventHandler.prototype._getraycastInfo(e);
            //回调函数
            this._inputEvents[EventHandler.prototype.EventType.RIGHT_CLICK](
                optmove
            );
        }
    };
    //注册鼠标左键键双击事件
    EventHandler.prototype._ceateLeftdblclickEvent = function (e) {
        if (viewer.scene == undefined) return;
        if (e.button == 0) {
            let optmove = EventHandler.prototype._getraycastInfo(e);
            //回调函数
            this._inputEvents[
                EventHandler.prototype.EventType.LEFT_DOUBLE_CLICK
            ](optmove);
        }
    };
    //注册鼠标右键双击事件
    EventHandler.prototype._ceateRightdblclickEvent = function (e) {
        if (viewer.scene == undefined) return;
        if (e.button == 2) {
            this.dbclicknum++;
            let that = this;
            if (this.dbclicknum == 1) {
                setTimeout(function () {
                    if (that.dbclicknum > 1) {
                        let optmove = EventHandler.prototype._getraycastInfo(e);
                        //回调函数
                        that._inputEvents[
                            EventHandler.prototype.EventType.RIGHT_DOUBLE_CLICK
                        ](optmove);
                    }
                    that.dbclicknum = 0;
                }, 300);
            }
        }
    };
    //注册左键/中键/右键鼠标按下事件
    EventHandler.prototype._ceatemousedownEvent = function (e) {
        if (viewer.scene == undefined) return;
        let optmove = EventHandler.prototype._getraycastInfo(e);
        if (e.button == 0) {
            //回调函数
            this._inputEvents[EventHandler.prototype.EventType.LEFT_DOWN](
                optmove
            );
        }
        if (e.button == 1) {
            //回调函数
            this._inputEvents[EventHandler.prototype.EventType.MIDDLE_DOWN](
                optmove
            );
        }
        if (e.button == 2) {
            //回调函数
            this._inputEvents[EventHandler.prototype.EventType.RIGHT_DOWN](
                optmove
            );
        }
    };
    //注册左键/中键/右键鼠标松开事件
    EventHandler.prototype._ceatemouseupEvent = function (e) {
        if (viewer.scene == undefined) return;
        let optmove = EventHandler.prototype._getraycastInfo(e);
        if (e.button == 0) {
            //回调函数
            this._inputEvents[EventHandler.prototype.EventType.LEFT_UP](
                optmove
            );
        }
        if (e.button == 1) {
            //回调函数
            this._inputEvents[EventHandler.prototype.EventType.MIDDLE_UP](
                optmove
            );
        }
        if (e.button == 2) {
            //回调函数
            this._inputEvents[EventHandler.prototype.EventType.RIGHT_UP](
                optmove
            );
        }
    };
    //注册鼠标移动事件并回调
    EventHandler.prototype._ceatemousemoveEvent = function (e) {
        if (e.button == 0) {
            let optmove = EventHandler.prototype._getraycastInfo(e);
            this._inputEvents[EventHandler.prototype.EventType.MOUSE_MOVE](
                optmove
            );
        }
    };
    //注册鼠标滑动事件并回调
    EventHandler.prototype._ceatewheelEvent = function (e) {
        const Cartographics = viewer.scene.mainCamera.transform.cartographic;
        let Cameralevel = Li.GisUtil.altitudeToZoom(Cartographics.height);
        this._inputEvents[EventHandler.prototype.EventType.WHEEL]({
            height: Cartographics.height,
            zoom: Cameralevel,
        });
    };
    EventHandler.prototype._getInputEventKey = function (type, modifier) {
        var key = type;
        if (modifier !== undefined && modifier !== null) {
            key += "+" + modifier;
        }
        return key;
    };
    //
    EventHandler.prototype.removeInputAction = function (type) {
        this._canvas.style.cursor = "default";
        var that = this;
        switch (type) {
            case 0:
                this._canvas.removeEventListener(
                    "mousedown",
                    that._ceatemousedownEvent
                );
                break;
            case 1:
                this._canvas.removeEventListener(
                    "mouseup",
                    that._ceatemouseupEvent
                );
                break;
            case 2:
                this._canvas.removeEventListener(
                    "click",
                    that._ceateLeftclickEvent
                );
                break;
            case 3:
                this._canvas.removeEventListener(
                    "dblclick",
                    that._ceateLeftdblclickEvent
                );
                break;
            case 5:
                this._canvas.removeEventListener(
                    "mousedown",
                    that._ceatemousedownEvent
                );
                break;
            case 6:
                this._canvas.removeEventListener(
                    "mouseup",
                    that._ceatemouseupEvent
                );
                break;
            case 7:
                this._canvas.removeEventListener(
                    "contextmenu",
                    that._ceateRightclickEvent
                );
                break;
            case 8:
                this._canvas.removeEventListener(
                    "contextmenu",
                    that._ceateRightdblclickEvent
                );
                break;
            case 9:
                this._canvas.removeEventListener(
                    "mousedown",
                    that._ceatemousedownEvent
                );
                break;
            case 10:
                this._canvas.removeEventListener(
                    "mouseup",
                    that._ceatemouseupEvent
                );
                break;
            case 15:
                //鼠标移动
                this._canvas.removeEventListener(
                    "mousemove",
                    that._ceatemousemoveEvent
                );
                break;
            case 16:
                //鼠标滑动
                this._canvas.removeEventListener(
                    "wheel",
                    that._ceatewheelEvent
                );
                break;
        }
    };
    EventHandler.prototype._getTilesetinfo = function (sceneFeature) {
        var nowTilesetinfo = {};

        if (sceneFeature) {
            //viewer.scene.setSelectedFeature(sceneFeature);
            let modelnameList = sceneFeature.propertyNames();
            let size = modelnameList.size();
            for (let i = 0; i < size; i++) {
                let key = modelnameList.get(i);
                let value = sceneFeature.getProperty(key);
                //console.log(key + " : " + value);
                nowTilesetinfo[key] = value;
            }
        }
        return nowTilesetinfo;
    };
    //射线获取信息
    EventHandler.prototype._getraycastInfo = function (e) {
        let optmove = {};
        optmove.position = {};
        optmove.primitive = {};
        var camera = viewer.scene.mainCamera;
        var hit = new Li.RaycastHit(); //射线投影
        //鼠标点击的位置，通过相机视角射线获取
        var ray = camera.screenPointToRay(e.x, e.y);
        var rayok = viewer.scene.raycast(ray, hit); //判断是否存在
        //屏幕坐标
        optmove.position.flatposition = {
            x: e.x,
            y: e.y,
        };
        let point = null;
        if (hit) {
            //获取单击点中的信息
            point = hit.point; //Vector3
            //实体
            optmove.primitive.entity = hit.entity;
        }
        hit.delete();
        //笛卡尔坐标
        if (rayok && point) {
            //Vector3转笛卡尔
            optmove.position.Cartesian3 = point.toCartesian3();
            //笛卡尔转弧度转经纬度
            optmove.position.lonlatlocaltion = point
                .toCartesian3()
                .toCartographic()
                .toDegrees();
        }
        //获取Feature
        const sceneFeature = viewer.scene.getFeatureByMouse();
        optmove.feature = sceneFeature;
        //检查是否有存在模型并获取属性 3DTileset 模型
        optmove.primitive.Tilesetinfo =
            EventHandler.prototype._getTilesetinfo(sceneFeature);
        return optmove;
    };
    EventHandler.prototype.EventType = {
        /**
         * 左键按下.
         *
         * @type {Number}
         * @constant
         */
        LEFT_DOWN: 0,
        /**
         * 左键松开.
         *
         * @type {Number}
         * @constant
         */
        LEFT_UP: 1,

        /**
         * 左键单击.
         *
         * @type {Number}
         * @constant
         */
        LEFT_CLICK: 2,

        /**
         * 左键双击.
         *
         * @type {Number}
         * @constant
         */
        LEFT_DOUBLE_CLICK: 3,

        /**
         * 右键按下.
         *
         * @type {Number}
         * @constant
         */
        RIGHT_DOWN: 5,

        /**
         * 右键松开.
         *
         * @type {Number}
         * @constant
         */
        RIGHT_UP: 6,

        /**
         * 右键单击.
         *
         * @type {Number}
         * @constant
         */
        RIGHT_CLICK: 7,
        /**
         * 右键双击.
         *
         * @type {Number}
         * @constant
         */
        RIGHT_DOUBLE_CLICK: 8,

        /**
         * 鼠标中间按下.
         *
         * @type {Number}
         * @constant
         */
        MIDDLE_DOWN: 9,

        /**
         * 鼠标中间松开.
         *
         * @type {Number}
         * @constant
         */
        MIDDLE_UP: 10,

        /**
         * 鼠标移动.
         *
         * @type {Number}
         * @constant
         */
        MOUSE_MOVE: 15,

        /**
         * 滑轮滚动.
         *
         * @type {Number}
         * @constant
         */
        WHEEL: 16,
    };
    return EventHandler;
}

function global$v(Li, viewer) {
    /**
     * @description 模型对象
     * @constructor
     * @alias ModelEntity
     * @param {Object} options -参数
     * @param {String} options.url -模型链接
     * @param {String} [options.srs=null] -坐标类型(例：EPSG:4547)
     * @param {Object} options.position -模型位置
     * @param {Number} options.position.longitude -经度
     * @param {Number} options.position.latitude -纬度
     * @param {Number} options.position.height -高度
     * @param {Object} [options.offset={x:0,y:0,z:0}] -模型偏移
     * @param {Number} options.offset.x -X轴偏移量
     * @param {Number} options.offset.y -Y轴偏移量
     * @param {Number} options.offset.z -Z轴偏移量
     * @param {Object} [options.rotation={x:0,y:0,z:0}] -模型旋转角度
     * @param {Number} options.rotation.x -X轴旋转角
     * @param {Number} options.rotation.y -Y轴旋转角
     * @param {Number} options.rotation.z -Z轴旋转角
     * @param {Number} [options.scale=1.0] -缩放比例
     * @param {Boolean} [options.show=true] -是否显示
     */
    function ModelEntity(options) {
        /**
         * Li.Model实例对象.当前加载的模型
         * @type {Model}
         */
        this.model = null;
        /**
         * 所有模型的集合.
         * @type {Array}
         */
        this.modelCollection = [];
        this.EntityCollection = [];
        if (options) {
            this.add(options);
        }
    }
    /**
     * @description 添加模型对象
     * @param {Object} options -参数
     * @param {String} options.url -模型链接
     * @param {String} [options.srs=null] -坐标类型(例：EPSG:4547)
     * @param {Object} options.position -模型位置
     * @param {Number} options.position.longitude -经度
     * @param {Number} options.position.latitude -纬度
     * @param {Number} options.position.height -高度
     * @param {Object} [options.offset={x:0,y:0,z:0}] -模型偏移
     * @param {Number} options.offset.x -X轴偏移量
     * @param {Number} options.offset.y -Y轴偏移量
     * @param {Number} options.offset.z -Z轴偏移量
     * @param {Object} [options.rotation={x:0,y:0,z:0}] -模型旋转角度
     * @param {Number} options.rotation.x -X轴旋转角
     * @param {Number} options.rotation.y -Y轴旋转角
     * @param {Number} options.rotation.z -Z轴旋转角
     * @param {Number} [options.scale=1.0] -缩放比例
     * @param {Boolean} [options.show=true] -是否显示
     */
    ModelEntity.prototype.add = function (options) {
        let scene = viewer.scene;
        let model = new Li.Model(options.url);
        let entity = new Li.Entity();
        entity.addComponent(model);
        scene.addEntity(entity);
        if (!options.srs) {
            this.model = model;
            this.transform(options);
        } else {
            model.srs = options.srs;
        }
        model.entity.enabled = options.show || true;
        this.modelCollection.push(model);
        this.EntityCollection.push(entity);
        return model;
    };
    /**
     * @description 模型位置、角度和比例转变
     * @param {Object} options -参数
     * @param {Model} [options] -模型对象
     * @param {Object} options.position -模型位置
     * @param {Number} options.position.longitude -经度
     * @param {Number} options.position.latitude -纬度
     * @param {Number} options.position.height -高度
     * @param {Object} [options.offset=null] -模型偏移
     * @param {Number} options.offset.x -笛卡尔坐标x
     * @param {Number} options.offset.y -笛卡尔坐标y
     * @param {Number} options.offset.z -笛卡尔坐标Z
     * @param {Object} [options.rotation={x:0,y:0,z:0}] -模型旋转角度
     * @param {Number} options.rotation.x -X轴旋转角
     * @param {Number} options.rotation.y -Y轴旋转角
     * @param {Number} options.rotation.z -Z轴旋转角
     * @param {Number} [options.scale=1.0] -缩放比例
     */
    ModelEntity.prototype.transform = function (options, Editmodel) {
        let model = Editmodel || this.model;
        let position = options.position;
        let rotation = options.rotation;
        let offset = options.offset;
        //位置
        if (!options.srs && position) {
            let carto = Li.Cartographic.fromDegrees(
                position.longitude,
                position.latitude,
                position.height
            );
            model.transform.cartographic = carto;
        }
        // 偏移
        if (offset) {
            model.offset = Li.Vector3.create(offset.x, offset.y, offset.z);
        }
        // 旋转
        if (rotation) {
            model.rotation = Li.Quaternion.fromEulerAngles(
                rotation.x,
                rotation.y,
                rotation.z
            );
        }
        // 缩放
        if (options.scale) {
            model.scale = Li.Vector3.create(
                options.scale,
                options.scale,
                options.scale
            );
        }
    };
    /**
     * @description 移除当前模型
     */
    ModelEntity.prototype.remove = function () {
        let Entity = this.EntityCollection.pop();
        this.modelCollection.pop();
        if (Entity) {
            Entity.delete();
            if (this.modelCollection.length > 0) {
                this.model =
                    this.modelCollection[this.modelCollection.length - 1];
            } else {
                this.model = null;
            }
        }
    };
    /**
     * @description 移除该实例的所有模型
     */
    ModelEntity.prototype.removeAll = function () {
        for (let i = 0; i < this.modelCollection.length; i++) {
            this.remove();
            i--;
        }
        this.modelCollection = [];
        this.EntityCollection = [];
    };
    Object.defineProperties(ModelEntity.prototype, {
        /**
         * 渲染器(模型加载完才能获取属性)
         * @memberof ModelEntity.prototype
         * @type {Object}
         * @readonly
         */
        renderer: {
            get() {
                let stack = [];
                let renderer = null;
                let model = this.model;
                stack.push(model.entity);
                while (stack.length) {
                    let entity = stack.pop();
                    if (entity.renderer) {
                        renderer = entity.renderer;
                        break;
                    }
                    let children = entity.childEntities;
                    for (let i = 0; i < children.size(); i++) {
                        stack.push(children.get(i));
                    }
                }
                return renderer;
            },
        },
        /**
         * 模型加载完回调函数
         * @memberof ModelEntity.prototype
         * @type {Function}
         * @example
         *  model.onloaded = function () {
         *      let renderer = model.renderer;
         *  };
         */
        onloaded: {
            set(fn) {
                if (typeof fn == "function") {
                    let model = this.model;
                    model.readyPromise.then(() => {
                        fn.call(this);
                    });
                }
            },
        },
        /**
         * 显示或隐藏模型
         * @memberof ModelEntity.prototype
         * @type {Boolean}
         */
        show: {
            get() {
                return this.model.entity.enabled;
            },
            set(val) {
                this.model.entity.enabled = val;
            },
        },
    });
    return ModelEntity;
}
//darren-♏

/**
 * 判断new Object()生成的对象
 * @param {Object} obj -数据类型Object
 * @returns {Boolean}
 * @private
 */
function isPlainObject(obj) {
    let toString = Object.prototype.toString;
    let hasOwn = Object.prototype.hasOwnProperty;
    if (toString.call(obj) !== "[object Object]") {
        return false;
    }
    if (
        obj.constructor &&
        !hasOwn.call(obj.constructor.prototype, "isPrototypeOf")
    ) {
        return false;
    }
    return true;
}

/**
 * 合并参数
 * @param {Object} target -目标对象
 * @param {Object} from -合并的对象
 * @returns {Object}
 * @private
 */
function mergeOptions(target, from) {
    if (!from) return target;
    let keys = Object.keys(from);
    for (let i = 0; i < keys.length; i++) {
        let key = keys[i];
        if (isPlainObject(from[key])) {
            target[key] = mergeOptions(target[key] || {}, from[key]);
        } else {
            target[key] = from[key];
        }
    }
    return target;
}

/**
 * 类数组对象转数组
 * @param {Object} list -类对象数组
 * @param {Number} start -开始下标
 * @returns {Array}
 * @private
 */
function toArray(list, start) {
    start = start || 0;
    let i = list.length - start;
    const ret = new Array(i);
    while (i--) {
        ret[i] = list[i + start];
    }
    return ret;
}

/**
 * 颜色转换
 * @param {String} str - 16进制颜色格式
 * @returns {String}
 * @private
 */
function color16ToRgb(str) {
    let reg = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;
    if (!reg.test(str)) {
        return;
    }
    let newStr = str.toLowerCase().replace(/\#/g, "");
    let len = newStr.length;
    if (len == 3) {
        let t = "";
        for (let i = 0; i < len; i++) {
            t += newStr.slice(i, i + 1).concat(newStr.slice(i, i + 1));
        }
        newStr = t;
        len = 6;
    }
    let arr = []; //将字符串分隔，两个两个的分隔
    if (len == 6) {
        newStr += "ff";
    }
    for (let i = 0; i < 8; i = i + 2) {
        let s = newStr.slice(i, i + 2);
        let num = parseInt("0x" + s);
        arr.push(num);
    }
    return {
        r: arr[0],
        g: arr[1],
        b: arr[2],
        a: arr[3],
    };
}
/**
 * rgba颜色处理
 * @param {String} color - rgba颜色格式
 * @returns {String}
 * @private
 */
function disposeColor(color) {
    var strRgd1 = color.split("(");
    var strRgd = strRgd1[1].split(")");
    var strRgd2 = strRgd[0].split(",");
    return {
        r: Number(strRgd2[0]),
        g: Number(strRgd2[1]),
        b: Number(strRgd2[2]),
        a: parseInt(Number(strRgd2[3]) * 255),
    };
}

//随机id
function createGuid() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
        /[xy]/g,
        function (c) {
            var r = (Math.random() * 16) | 0;
            var v = c === "x" ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        }
    );
}

function global$u(Li, viewer) {
    function Tiles3dLayer(options) {
        /**
         * Li.Tileset实例对象. 当前实例化的3dTiles模型
         * @type {Tileset}
         */
        this.modelTiles = null;
        /**
         * 所有3dTiles模型的集合
         * @type {Array}
         */
        this.Tiles3dCollection = [];
        if (options) {
            this.add(options);
        }
    }
    /**
     * @description 添加3dTiles对象
     * @param {Object} options -参数
     * @param {String} options.url -3dTiles模型链接
     * @param {Boolean} [options.streamingMode=true] -设置3dtiles是否以流模式加载
     * @param {Boolean} [options.skipLevelOfDetail=true] -设置3dtiles是否跳过LOD节点加载
     * @param {Boolean} [options.genMeshNormals=false] -设置3dtiles是否重新计算法线
     * @param {Boolean} [options.clipLevelOfDetail=true] -设置3dtiles是否裁切LOD
     * @param {Number} [options.skipLevelOfRenderable=0] -设置3dtiles不显示低于某级的LOD
     * @param {Number} [options.geometricErrorScale=1] -设置3dtiles的几何误差比例
     * @param {String} [options.id] -模型id
     * @param {Boolean} [options.show=true] -模型是否显示
     */
    Tiles3dLayer.prototype.add = function (options) {
        let tileset = new Li.Tileset(options.url);
        if (options.streamingMode) {
            tileset.streamingMode = options.streamingMode || true; // 流式加载
        }
        if (options.skipLevelOfDetail) {
            tileset.skipLevelOfDetail = options.skipLevelOfDetail || true; // 跳过层级
        }
        if (options.genMeshNormals) {
            tileset.genMeshNormals = options.genMeshNormals || false; //   生成法线
        }
        if (options.clipLevelOfDetail) {
            tileset.clipLevelOfDetail = options.clipLevelOfDetail || true; //   是否裁切LOD
        }
        if (options.skipLevelOfRenderable) {
            tileset.skipLevelOfRenderable = options.skipLevelOfRenderable || 0; //不显示低于某级的LOD
        }
        if (options.geometricErrorScale) {
            tileset.geometricErrorScale = options.geometricErrorScale || 1; //几何误差比例
        }
        let id = options.id || createGuid(); //tiles的id
        options.id = id;
        tileset.attr = options;
        this.modelTiles = tileset;
        this.show = options.show == undefined ? true : options.show;
        let entity = new Li.Entity();
        entity.addComponent(tileset);
        viewer.scene.addEntity(entity);
        this.Tiles3dCollection.push(tileset);
    };
    /**
     * @description 3dTiles模型位置、角度和比例转变
     * @param {Object} options -参数
     * @param {Tileset} [Editmodel] -3dTiles模型，非必填
     * @param {Object} options.offset -3dTiles模型偏移量
     * @param {Number} [options.offset.x=0] -设置3dtiles模型X轴偏移
     * @param {Number} [options.offset.y=0] -设置3dtiles模型Y轴偏移
     * @param {Number} [options.offset.z=0] -设置3dtiles模型Z轴偏移
     * @param {Object} options.rotation -3dTiles模型旋转设置
     * @param {Number} [options.rotation.x=0] -设置3dtiles模型X轴偏移
     * @param {Number} [options.rotation.y=0] -设置3dtiles模型Y轴偏移
     * @param {Number} [options.rotation.z=0] -设置3dtiles模型Z轴偏移
     */
    Tiles3dLayer.prototype.transform = function (options, Editmodel) {
        let nowoffset = options.offset || { x: 0, y: 0, z: 0 };
        let nowrotation = options.rotation || { x: 0, y: 0, z: 0 };
        let rotation = Li.Quaternion.fromEulerAngles(
            nowrotation.x,
            nowrotation.y,
            nowrotation.z
        ); //四元数 控制旋转
        let offset = Li.Vector3.create(nowoffset.x, nowoffset.y, nowoffset.z); //偏移量
        let matrix3 = rotation.toRotationMatrix(); //四元数转3*3旋转矩阵
        let newMatrix4 = Li.Matrix4.fromRotationTranslation(matrix3, offset);
        this.modelMatrix = newMatrix4;
    };
    /**
     * @description 移除当前加载的3dTiles模型
     * @param {Tileset} [Editmodel] -3dTiles模型，非必填
     */
    Tiles3dLayer.prototype.remove = function (EditTiles) {
        let tiles = EditTiles || this.Tiles3dCollection.pop();
        if (tiles instanceof Li.Tileset) {
            tiles.entity.delete();
            if (this.Tiles3dCollection.length > 0) {
                this.modelTiles =
                    this.Tiles3dCollection[this.Tiles3dCollection.length - 1];
            } else {
                this.modelTiles = null;
            }
        }
    };
    /**
     * @description 移除集合中的所有3dTiles模型
     */
    Tiles3dLayer.prototype.removeAll = function () {
        for (let i = 0; i < this.Tiles3dCollection.length; i++) {
            this.remove();
            i--;
        }
        this.modelCollection = [];
        this.EntityCollection = [];
    };
    Object.defineProperties(Tiles3dLayer.prototype, {
        /**
         * 3dTiles模型的包围球
         * @memberof ModelEntity.prototype
         * @type {Object}
         * @readonly
         */
        bounds: {
            get() {
                let bounds = this.modelTiles.rectangle.bounds();
                return bounds;
            },
        },
        /**
         * 3dTiles模型的中心点
         * @memberof ModelEntity.prototype
         * @type {Cartographic}
         * @readonly
         */
        center: {
            get() {
                let cneter = this.modelTiles.rectangle.center();
                return cneter;
            },
        },
        /**
         * 3dTiles模型的4*4矩阵
         * @memberof ModelEntity.prototype
         * @type {Array}
         */
        modelMatrix: {
            get() {
                let newMatrix = [];
                let m = this.modelTiles.modelMatrix;
                for (let i = 0; i < 4; i++) {
                    let row = m.row(i);
                    newMatrix.push(row.w);
                    newMatrix.push(row.x);
                    newMatrix.push(row.y);
                    newMatrix.push(row.z);
                }
                return newMatrix;
            },
            set(val) {
                this.modelTiles.modelMatrix = val;
            },
        },
        /**
         * 3dTiles模型的矩形范围
         * @memberof ModelEntity.prototype
         * @type {Object}
         * @readonly
         */
        rectangle: {
            get() {
                let rectangleList = {};
                for (let key in this.modelTiles.rectangle) {
                    if (
                        key == "east" ||
                        key == "south" ||
                        key == "west" ||
                        key == "north"
                    ) {
                        let val = this.modelTiles.rectangle[key];
                        rectangleList[key] = val;
                    }
                }
                return rectangleList;
            },
        },
        /**
         * 是否显示3dTiles模型
         * @memberof ModelEntity.prototype
         * @type {Boolean}
         */
        show: {
            get() {
                return this.modelTiles.enabled;
            },
            set(val) {
                this.modelTiles.enabled = val;
            },
        },
        /**
         * 模型加载完回调函数
         * @memberof ModelEntity.prototype
         * @type {Function}
         * @example
         *  modelTiles.onloaded = function () {
         *      let renderer = modelTiles.renderer;
         *  };
         */
        onloaded: {
            set(fn) {
                if (typeof fn == "function") {
                    let model = this.modelTiles;
                    model.readyPromise.then(() => {
                        fn.call(this);
                    });
                }
            },
        },
    });
    return Tiles3dLayer;
}
//darren-♏

function global$t(Li, viewer) {
    /**
     * @description 模型对象
     * @constructor
     * @alias ImageryLayer
     * @param {Object} options -参数
     * @param {String} options.url -影像服务链接
     * @param {String} options.type -影像服务类型（例如："xyz":标准xyz金字塔,"wmts":WMTS服务,"Tdt":天地图,"arcgis":ArcGIS标准服务图层）
     * @param {Boolean} [options.useWebMercator=false] -是否使用Web墨卡托,如果为true使用Web墨卡托构建的地图切片方案.
     * @param {Number} [options.tileWidth=256]  -切片的宽度
     * @param {Number} [options.tileHeight=256]  -切片的宽度
     * @param {Number} [options.hasAlphaChannel=false]  -是否含有阿尔法通道
     * @param {Number} [options.minimumLevel=0]  -最低层级
     * @param {Number} [options.maximumLevel=21]  -最高层级
     * @param {Boolean} [options.isLabel=false]  -是否为注记图层(如天地图的注记服务)
     * @param {Array} [options.rectangle] -图像的矩形范围
     *
     */
    function ImageryLayer(options) {
        options = options || {};
        this._viewer = viewer;
        this._scene = viewer.scene;
        this._rectangle = [-180, -90, 180, 90];
        this._useWebMercator = false;
        this._maximumLevel = 21;
        this._minimumLevel = 0;
        this._tileWidth = 256;
        this._tileHeight = 256;
        this._hasAlphaChannel = true;
        this._isLabel = false;
        if (!this._viewer) {
            console.error("parametererror：", "viewer is undefined");
            return;
        }
        /**
         * 所有影像集合.
         * @type {Array}
         */
        this.ImageryLayerCollection = [];
        /**
         * 是否显示当前的影像图层
         * @type {Boolean}
         */
        this.show = null;
        /**
         * 获取当前的影像图层
         * @type {ImageryLayer}
         */
        this.ImageryLayer = null;
        //判断类型
        switch (options.type) {
            case "xyz":
                this.xyzLayer(options);
                break;
            case "wmts":
                this.wmtsLayer(options);
                break;
            case "dom-wmts":
                //暂时无
                return;
            case "Tdt":
                this.TdtLayer(options);
                break;
            case "arcgis":
                this.ArcgisLayer(options);
                break;
            default:
                this.nowImageryLayer = null;
                break;
        }
    }

    Object.defineProperty(ImageryLayer.prototype, "ImageryLayer", {
        get() {
            if (this.ImageryLayerCollection.length > 0) {
                return this.ImageryLayerCollection[
                    this.ImageryLayerCollection.length - 1
                ];
            } else {
                return undefined;
            }
        },
        set(Layer) {
            if (this.ImageryLayer) {
                this.ImageryLayer.remove();
                this.ImageryLayerCollection[
                    this.ImageryLayerCollection.length
                ] = Layer;
            }
        },
    });

    Object.defineProperty(ImageryLayer.prototype, "show", {
        get() {
            var opt = this._getshow();
            if (opt) {
                return this.ImageryLayer[opt.name];
            }
        },
        set(val) {
            var opt = this._getshow();
            if (opt) {
                this.ImageryLayer[opt.name] = val;
            }
        },
    });
    /**
     * @description 加载由天地图数据平台提供的底图链接
     * @param {Object} options -参数对象
     * @param {String} options.url -影像服务链接
     * @param {Boolean} [options.useWebMercator=false] -是否使用Web墨卡托,如果为true使用Web墨卡托构建的地图切片方案.
     * @param {Number} [options.tileWidth=256]  -切片的宽度
     * @param {Number} [options.tileHeight=256]  -切片的宽度
     * @param {Number} [options.hasAlphaChannel=false]  -是否含有阿尔法通道
     * @param {Number} [options.minimumLevel=0]  -最低层级
     * @param {Number} [options.maximumLevel=21]  -最高层级
     * @param {Boolean} [options.isLabel=false]  -是否为注记图层(如天地图的注记服务和影像服务同时使用，注记服务加载时，isLabel:true；影像服务加载时，isLabel:false)
     */
    ImageryLayer.prototype.TdtLayer = function (options, viewer) {
        options = options || {};
        var _viewer = viewer || this._viewer;
        if (_viewer) {
            if (options.url) {
                var nowImageryLayer = new Li.TiandituImageryLayer();
                nowImageryLayer.url = options.url; //链接
                nowImageryLayer.useWebMercator =
                    options.useWebMercator || this._useWebMercator;
                nowImageryLayer.tileWidth =
                    options.tileWidth || this._tileWidth;
                nowImageryLayer.tileHeight =
                    options.tileHeight || this._tileHeight;
                nowImageryLayer.minimumLevel =
                    options.minimumLevel == undefined
                        ? this._minimumLevel
                        : options.minimumLevel;
                nowImageryLayer.maximumLevel =
                    options.maximumLevel || this._maximumLevel;
                nowImageryLayer.hasAlphaChannel =
                    options.hasAlphaChannel || this._hasAlphaChannel;
                nowImageryLayer.isLabel =
                    options.isLabel == undefined
                        ? this._isLabel
                        : options.isLabel;
                nowImageryLayer.componentComplete();
                options.type = "Tdt";
                nowImageryLayer.attropt = options;
                this.ImageryLayerCollection.push(nowImageryLayer);
            }
        } else {
            console.error("parametererror：", "viewer is undefined");
        }
    };

    /**
     * @description 加载金字塔xyz影像的链接
     * @param {Object} options -参数对象
     * @param {String} options.url -影像服务链接
     * @param {Array} [options.rectangle=[-180, -90, 180, 90]] -图像的矩形范围
     * @param {Boolean} [options.useWebMercator=false] -是否使用Web墨卡托,如果为true使用Web墨卡托构建的地图切片方案.
     * @param {Number} [options.tileWidth=256]  -切片的宽度
     * @param {Number} [options.tileHeight=256]  -切片的宽度
     * @param {Number} [options.hasAlphaChannel=false]  -是否含有阿尔法通道
     * @param {Number} [options.minimumLevel=0]  -最低层级
     * @param {Number} [options.maximumLevel=21]  -最高层级
     * @param {String} options.licensekey -影像服务的licensekey，针对请求头需要key设置的底图服务
     *
     */
    ImageryLayer.prototype.xyzLayer = function (options, viewer) {
        options = options || {};
        var _viewer = viewer || this._viewer;
        if (_viewer) {
            var nowrectangle = options.rectangle || this._rectangle;
            let newrectangle = Li.Rectangle.fromDegrees(
                nowrectangle[0],
                nowrectangle[1],
                nowrectangle[2],
                nowrectangle[3]
            );
            if (options.url) {
                var nowurl = options.url;
                var imageryProvider = new Li.UrlTemplateImageryProvider(
                    nowurl,
                    options.useWebMercator == undefined
                        ? this._useWebMercator
                        : options.useWebMercator, // useWebMercator
                    options.maximumLevel || this._maximumLevel, // maximumLevel
                    options.minimumLevel == undefined
                        ? _minimumLevel
                        : options.minimumLevel, // minimumLevel
                    options.tileWidth || this._tileWidth, // tileWidth
                    options.tileHeight || this._tileHeight, // tileHeight
                    options.hasAlphaChannel == undefined
                        ? this._hasAlphaChannel
                        : options.hasAlphaChannel // hasAlphaChannel
                );
                if (options.licensekey) {
                    imageryProvider.setUrlFunctor(function (x, y, level) {
                        var url =
                            options.url +
                            (level - 9) +
                            "/" +
                            y +
                            "/" +
                            x +
                            "?format=image%2Fpng";
                        return url;
                    });
                    imageryProvider.setHeader(
                        "szvsud-license-key",
                        options.licensekey
                    );
                }
                var nowImageryLayer = new Li.ImageryLayer(
                    imageryProvider,
                    newrectangle
                );
                options.type = "xyz";
                nowImageryLayer.attropt = options;
                _viewer.scene.globe.addImageryLayer(nowImageryLayer);
                this.ImageryLayerCollection.push(nowImageryLayer);
            }
        } else {
            console.error("parametererror：", "viewer is undefined");
        }
    };
    /**
     * @description 加载wmts的底图服务
     * @param {Object} options -参数对象
     * @param {String} options.url -影像服务链接（非请求链接，是在QGIS中加载后获取到的源链接）
     *
     */
    ImageryLayer.prototype.wmtsLayer = function (options, viewer) {
        options = options || {};
        var _viewer = viewer || this._viewer;
        if (_viewer) {
            if (options.url) {
                var nowImageryLayer = _viewer.scene.globe.addWmsImageryLayer(
                    options.url
                );
                options.type = "wmts";
                nowImageryLayer.attropt = options;
                this.ImageryLayerCollection.push(nowImageryLayer);
            }
        } else {
            console.error("parametererror：", "viewer is undefined");
        }
    };

    /**
     * @description 加载arcgis mapserver的底图服务
     * @param {Object} options -参数对象
     * @param {String} options.url -影像服务链接
     *
     */
    ImageryLayer.prototype.ArcgisLayer = function (options, viewer) {
        options = options || {};
        var _viewer = viewer || this._viewer;
        if (_viewer) {
            if (options.url) {
                var nowImageryLayer =
                    _viewer.scene.globe.addArcGisMapServerImageryLayer(
                        options.url
                    );
                options.type = "arcgis";
                nowImageryLayer.attropt = options;
                this.ImageryLayerCollection.push(nowImageryLayer);
            }
        } else {
            console.error("parametererror：", "viewer is undefined");
        }
    };
    /**
     * @description 根据影像类型对影像显隐控制
     * @param {String} type -影像类型（例如："Tdt"为天地图类型）
     * @param {Boolean} show -影像是否显示，true为显示，false为隐藏
     *
     */
    ImageryLayer.prototype.showByType = function (type, show) {
        for (var i = 0; i < this.ImageryLayerCollection.length; i++) {
            var imageryLayer = this.ImageryLayerCollection[i];
            var nowattr = imageryLayer.attropt;
            if (nowattr.type === type) {
                var opt = this._getshow(imageryLayer);
                imageryLayer[opt.name] = show;
            }
        }
    };

    /**
     * @description 销毁当前影像图层
     * @param {ImageryLayer} [nowlayer] -当前影像图层
     */
    ImageryLayer.prototype.remove = function (nowlayer) {
        var nowImageryLayer = nowlayer || this.ImageryLayerCollection.pop();
        if (nowImageryLayer) {
            var attr = nowImageryLayer.attropt || {};
            if (attr.type == "Tdt") {
                nowImageryLayer.delete();
            } else {
                this._scene.globe.removeImageryLayer(nowImageryLayer);
            }
        } else {
            console.error("运行错误：", "影像已空");
        }
    };
    /**
     * @description 根据类型销毁集合中的影像图层
     * @param {String} type -影像类型（例如："Tdt"为天地图类型）
     */
    ImageryLayer.prototype.removeByType = function (type) {
        var nums = [];
        this.ImageryLayerCollection.forEach(function (Layer, i) {
            var attr = Layer.attropt || {};
            if (attr.type === "Tdt" && attr.type === type) {
                try {
                    Layer.delete();
                } catch (error) {}
                nums.push(i);
            } else if (attr.type === type) {
                try {
                    this._scene.globe.removeImageryLayer(Layer);
                } catch (error) {}
                nums.push(i);
            }
        });
        for (var i = 0; i < nums.length; i++) {
            var num = nums[i];
            this.ImageryLayerCollection.splice(num, 1);
        }
    };
    /**
     * @description 销毁集合中所有的影像图层
     */
    ImageryLayer.prototype.removeALL = function () {
        for (var i = 0; i < this.ImageryLayerCollection.length; i++) {
            this.remove();
        }
    };

    ImageryLayer.prototype._getshow = function (Layer) {
        var nowImageryLayer = Layer || this.ImageryLayer;
        if (nowImageryLayer) {
            var attr = nowImageryLayer.attropt || {};
            if (attr.type == "Tdt") {
                return {
                    name: "enabled",
                };
            } else {
                return {
                    name: "show",
                };
            }
        }
    };

    return ImageryLayer;
}
//darren-♏

function global$s(Li, viewer) {
    /**
     * @description DOM弹窗
     * @constructor
     * @alias DomPopover
     * @param {Object} options -参数
     * @param {Number} [options.type=1] -类型
     *   |可选值       | 描述          |
     *   |--------    |--------       |
     *   |  1         | 指示弹窗       |
     *   |  2         | 流动线弹窗     |
     *   |  3         | 自定义html弹窗 |
     * @param {Object} options.position -空间位置
     * @param {Number} options.position.longitude -经度
     * @param {Number} options.position.latitude -纬度
     * @param {Number} options.position.height -高度
     * @param {String} [options.width=180px] -宽度（type=2时）
     * @param {String} [options.height=30px] -宽度（type=2时）
     * @param {String} [options.maxWidth=180px] -最大宽度（type=1时）
     * @param {String} [options.fontSize=14px] -字体颜色
     * @param {String} [options.color=#409EFF] -字体颜色
     * @param {String} [options.backgroundColor=rgba(64,158,255,0.5)] -背景颜色
     */
    function DomPopover(options) {
        let defaults = {
            type: 1,
            style: {},
        };
        this._options = mergeOptions(defaults, options);
        this.initQuequeClock();
        /**
         * 元素节点.
         * @type {Element}
         */
        this.elem = this.createElement(this._options);
    }
    DomPopover.prototype.createElement = function (options) {
        let elem = document.createElement("div");
        if (options.type == 2) {
            let style = options.style;
            let width = removePx(style.width) || 180;
            let height = removePx(style.height) || 30;
            let padding = removePx(style.padding) || 8;
            let fontSize = removePx(style.fontSize) || 14;
            let color = style.color || "#fff";
            let borderColor = style.borderColor || "#409EFF";
            let bgColor = style.backgroundColor || "rgba(64,158,255,0.5)";
            elem.style.cssText = `
                position: absolute;
                width: ${width}px;
                height: ${height}px;
                text-align: justify;
                font-size:${fontSize}px;
                color: ${color};
                box-shadow: inset 0 0 0 1px ${borderColor};
                padding:${padding}px;
                background-color:${bgColor};
            `;
            elem.className = "ssmap_dom-popover-wrapper";
            elem.innerHTML = options.text;
            let styleElem = document.createElement("style");
            styleElem.innerHTML = `
                .ssmap_dom-popover-wrapper::before,
                .ssmap_dom-popover-wrapper::after {
                    content: "";
                    position: absolute;
                    top: 0;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    margin: -${padding}px;
                    color: ${borderColor};
                    box-shadow: inset 0 0 0 2px;
                    animation: ssmap__dom-popover-animation 8s linear infinite;
                }
                .ssmap_dom-popover-wrapper::before {
                    animation-delay: -4s;
                }
                @keyframes ssmap__dom-popover-animation {
                    0%,
                    100% {
                        clip: rect(0px, ${width + padding * 4}px, 2px, 0px);
                    }
                    25% {
                        clip: rect(0px, 2px, ${height + padding * 4}px, 0px);
                    }
                    50% {
                        clip: rect(${height + padding * 4}px, ${
                width + padding * 4
            }px, ${width + padding * 4}px,0px);
                    }
                    75% {
                        clip: rect(0px, ${width + padding * 4}px, ${
                height + padding * 4
            }px, ${width + padding * 4}px);
                    }
                }
            `;
            document.head.appendChild(styleElem);
            function removePx(string) {
                if (!string) {
                    return "";
                } else {
                    string = string.split("px")[0];
                    return Number(string);
                }
            }
        } else if (options.type == 3) {
            elem.style.position = "absolute";
            elem.innerHTML = options.html;
        } else {
            let style = options.style;
            let maxWidth = style.maxWidth || "180px";
            let fontSize = style.fontSize || "13px";
            let color = style.color || "#fff";
            let bgColor = style.backgroundColor || "#409EFF";
            elem.style.cssText = `
                position: absolute;
                font-size: ${fontSize};
                max-width: ${maxWidth};
                color: ${color};
                background: ${bgColor};
                border-radius: 4px;
                padding: 10px;
                z-index: 0;
                line-height: 1.4;
                min-width: 50px;
                word-wrap: break-word;
                text-align: justify;
                cursor:pointer;
            `;
            elem.innerHTML = options.text;
            let icon = document.createElement("span");
            icon.style.cssText = `
                position: absolute;
                display: block;
                width: 0;
                height: 0;
                border-color: ${bgColor};
                border-style: solid;
                border-width: 8px;
                left: 50%;
                bottom: -7px;
                transform: translateX(-50%) rotate(45deg);
                z-index: -1;
            `;
            elem.appendChild(icon);
        }
        let position = Li.Cartographic.fromDegrees(
            options.position.longitude,
            options.position.latitude,
            options.position.height
        );
        position = position.toVector3();
        elem.position = position;
        document.body.appendChild(elem);
        window.SSMAP_DOM_POPOVER_ARRAY.push(elem);
        return elem;
    };
    /**
     * @description 移除
     */
    DomPopover.prototype.remove = function () {
        let list = window.SSMAP_DOM_POPOVER_ARRAY;
        key = list.indexOf(this.elem);
        if (key > -1) {
            list.splice(key, 1);
            this.elem.remove();
        }
    };
    DomPopover.prototype.initQuequeClock = function () {
        if (!window.SSMAP_DOM_POPOVER_ARRAY) {
            window.SSMAP_DOM_POPOVER_ARRAY = [];
            let scene = viewer.scene;
            window.SSMAP_DOM_POPOVER_ARRAY.updateHandler =
                viewer.addEventListener("update", function () {
                    let list = window.SSMAP_DOM_POPOVER_ARRAY;
                    list.forEach((elem) => {
                        let position = scene.mainCamera.worldToScreenPoint(
                            elem.position
                        );
                        if (position.z > 1 || position.z < -1) {
                            position.x = -10000;
                        }
                        elem.style.left =
                            position.x - elem.clientWidth / 2 + "px";
                        elem.style.top =
                            position.y - elem.clientHeight - 15 + "px";
                    });
                });
        }
    };
    /**
     * @description 移除所有实例
     */
    DomPopover.removeAll = function () {
        let list = window.SSMAP_DOM_POPOVER_ARRAY;
        if (list && list.length > 0) {
            list.forEach((elem) => {
                elem.remove();
            });
            viewer.removeEventListener(list.updateHandler);
            window.SSMAP_DOM_POPOVER_ARRAY = null;
        }
    };

    return DomPopover;
}

// mapbox开源算法

function earcut$1(data, holeIndices, dim) {
    dim = dim || 2;

    var hasHoles = holeIndices && holeIndices.length,
        outerLen = hasHoles ? holeIndices[0] * dim : data.length,
        outerNode = linkedList$1(data, 0, outerLen, dim, true),
        triangles = [];

    if (!outerNode || outerNode.next === outerNode.prev) return triangles;

    var minX, minY, maxX, maxY, x, y, invSize;

    if (hasHoles) outerNode = eliminateHoles$1(data, holeIndices, outerNode, dim);

    // if the shape is not too simple, we'll use z-order curve hash later; calculate polygon bbox
    if (data.length > 80 * dim) {
        minX = maxX = data[0];
        minY = maxY = data[1];

        for (var i = dim; i < outerLen; i += dim) {
            x = data[i];
            y = data[i + 1];
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
        }

        // minX, minY and invSize are later used to transform coords into integers for z-order calculation
        invSize = Math.max(maxX - minX, maxY - minY);
        invSize = invSize !== 0 ? 1 / invSize : 0;
    }

    earcutLinked$1(outerNode, triangles, dim, minX, minY, invSize);

    return triangles;
}

// create a circular doubly linked list from polygon points in the specified winding order
function linkedList$1(data, start, end, dim, clockwise) {
    var i, last;

    if (clockwise === signedArea$1(data, start, end, dim) > 0) {
        for (i = start; i < end; i += dim)
            last = insertNode$1(i, data[i], data[i + 1], last);
    } else {
        for (i = end - dim; i >= start; i -= dim)
            last = insertNode$1(i, data[i], data[i + 1], last);
    }

    if (last && equals$1(last, last.next)) {
        removeNode$1(last);
        last = last.next;
    }

    return last;
}

// eliminate colinear or duplicate points
function filterPoints$1(start, end) {
    if (!start) return start;
    if (!end) end = start;

    var p = start,
        again;
    do {
        again = false;

        if (
            !p.steiner &&
            (equals$1(p, p.next) || area$1(p.prev, p, p.next) === 0)
        ) {
            removeNode$1(p);
            p = end = p.prev;
            if (p === p.next) break;
            again = true;
        } else {
            p = p.next;
        }
    } while (again || p !== end);

    return end;
}

// main ear slicing loop which triangulates a polygon (given as a linked list)
function earcutLinked$1(ear, triangles, dim, minX, minY, invSize, pass) {
    if (!ear) return;

    // interlink polygon nodes in z-order
    if (!pass && invSize) indexCurve$1(ear, minX, minY, invSize);

    var stop = ear,
        prev,
        next;

    // iterate through ears, slicing them one by one
    while (ear.prev !== ear.next) {
        prev = ear.prev;
        next = ear.next;

        if (invSize ? isEarHashed$1(ear, minX, minY, invSize) : isEar$1(ear)) {
            // cut off the triangle
            triangles.push(prev.i / dim);
            triangles.push(ear.i / dim);
            triangles.push(next.i / dim);

            removeNode$1(ear);

            // skipping the next vertex leads to less sliver triangles
            ear = next.next;
            stop = next.next;

            continue;
        }

        ear = next;

        // if we looped through the whole remaining polygon and can't find any more ears
        if (ear === stop) {
            // try filtering points and slicing again
            if (!pass) {
                earcutLinked$1(
                    filterPoints$1(ear),
                    triangles,
                    dim,
                    minX,
                    minY,
                    invSize,
                    1
                );

                // if this didn't work, try curing all small self-intersections locally
            } else if (pass === 1) {
                ear = cureLocalIntersections$1(filterPoints$1(ear), triangles, dim);
                earcutLinked$1(ear, triangles, dim, minX, minY, invSize, 2);

                // as a last resort, try splitting the remaining polygon into two
            } else if (pass === 2) {
                splitEarcut$1(ear, triangles, dim, minX, minY, invSize);
            }

            break;
        }
    }
}

// check whether a polygon node forms a valid ear with adjacent nodes
function isEar$1(ear) {
    var a = ear.prev,
        b = ear,
        c = ear.next;

    if (area$1(a, b, c) >= 0) return false; // reflex, can't be an ear

    // now make sure we don't have other points inside the potential ear
    var p = ear.next.next;

    while (p !== ear.prev) {
        if (
            pointInTriangle$1(a.x, a.y, b.x, b.y, c.x, c.y, p.x, p.y) &&
            area$1(p.prev, p, p.next) >= 0
        )
            return false;
        p = p.next;
    }

    return true;
}

function isEarHashed$1(ear, minX, minY, invSize) {
    var a = ear.prev,
        b = ear,
        c = ear.next;

    if (area$1(a, b, c) >= 0) return false; // reflex, can't be an ear

    // triangle bbox; min & max are calculated like this for speed
    var minTX = a.x < b.x ? (a.x < c.x ? a.x : c.x) : b.x < c.x ? b.x : c.x,
        minTY = a.y < b.y ? (a.y < c.y ? a.y : c.y) : b.y < c.y ? b.y : c.y,
        maxTX = a.x > b.x ? (a.x > c.x ? a.x : c.x) : b.x > c.x ? b.x : c.x,
        maxTY = a.y > b.y ? (a.y > c.y ? a.y : c.y) : b.y > c.y ? b.y : c.y;

    // z-order range for the current triangle bbox;
    var minZ = zOrder$1(minTX, minTY, minX, minY, invSize),
        maxZ = zOrder$1(maxTX, maxTY, minX, minY, invSize);

    var p = ear.prevZ,
        n = ear.nextZ;

    // look for points inside the triangle in both directions
    while (p && p.z >= minZ && n && n.z <= maxZ) {
        if (
            p !== ear.prev &&
            p !== ear.next &&
            pointInTriangle$1(a.x, a.y, b.x, b.y, c.x, c.y, p.x, p.y) &&
            area$1(p.prev, p, p.next) >= 0
        )
            return false;
        p = p.prevZ;

        if (
            n !== ear.prev &&
            n !== ear.next &&
            pointInTriangle$1(a.x, a.y, b.x, b.y, c.x, c.y, n.x, n.y) &&
            area$1(n.prev, n, n.next) >= 0
        )
            return false;
        n = n.nextZ;
    }

    // look for remaining points in decreasing z-order
    while (p && p.z >= minZ) {
        if (
            p !== ear.prev &&
            p !== ear.next &&
            pointInTriangle$1(a.x, a.y, b.x, b.y, c.x, c.y, p.x, p.y) &&
            area$1(p.prev, p, p.next) >= 0
        )
            return false;
        p = p.prevZ;
    }

    // look for remaining points in increasing z-order
    while (n && n.z <= maxZ) {
        if (
            n !== ear.prev &&
            n !== ear.next &&
            pointInTriangle$1(a.x, a.y, b.x, b.y, c.x, c.y, n.x, n.y) &&
            area$1(n.prev, n, n.next) >= 0
        )
            return false;
        n = n.nextZ;
    }

    return true;
}

// go through all polygon nodes and cure small local self-intersections
function cureLocalIntersections$1(start, triangles, dim) {
    var p = start;
    do {
        var a = p.prev,
            b = p.next.next;

        if (
            !equals$1(a, b) &&
            intersects$1(a, p, p.next, b) &&
            locallyInside$1(a, b) &&
            locallyInside$1(b, a)
        ) {
            triangles.push(a.i / dim);
            triangles.push(p.i / dim);
            triangles.push(b.i / dim);

            // remove two nodes involved
            removeNode$1(p);
            removeNode$1(p.next);

            p = start = b;
        }
        p = p.next;
    } while (p !== start);

    return filterPoints$1(p);
}

// try splitting polygon into two and triangulate them independently
function splitEarcut$1(start, triangles, dim, minX, minY, invSize) {
    // look for a valid diagonal that divides the polygon into two
    var a = start;
    do {
        var b = a.next.next;
        while (b !== a.prev) {
            if (a.i !== b.i && isValidDiagonal$1(a, b)) {
                // split the polygon in two by the diagonal
                var c = splitPolygon$1(a, b);

                // filter colinear points around the cuts
                a = filterPoints$1(a, a.next);
                c = filterPoints$1(c, c.next);

                // run earcut on each half
                earcutLinked$1(a, triangles, dim, minX, minY, invSize);
                earcutLinked$1(c, triangles, dim, minX, minY, invSize);
                return;
            }
            b = b.next;
        }
        a = a.next;
    } while (a !== start);
}

// link every hole into the outer loop, producing a single-ring polygon without holes
function eliminateHoles$1(data, holeIndices, outerNode, dim) {
    var queue = [],
        i,
        len,
        start,
        end,
        list;

    for (i = 0, len = holeIndices.length; i < len; i++) {
        start = holeIndices[i] * dim;
        end = i < len - 1 ? holeIndices[i + 1] * dim : data.length;
        list = linkedList$1(data, start, end, dim, false);
        if (list === list.next) list.steiner = true;
        queue.push(getLeftmost$1(list));
    }

    queue.sort(compareX$1);

    // process holes from left to right
    for (i = 0; i < queue.length; i++) {
        outerNode = eliminateHole$1(queue[i], outerNode);
        outerNode = filterPoints$1(outerNode, outerNode.next);
    }

    return outerNode;
}

function compareX$1(a, b) {
    return a.x - b.x;
}

// find a bridge between vertices that connects hole with an outer ring and and link it
function eliminateHole$1(hole, outerNode) {
    var bridge = findHoleBridge$1(hole, outerNode);
    if (!bridge) {
        return outerNode;
    }

    var bridgeReverse = splitPolygon$1(bridge, hole);

    // filter collinear points around the cuts
    var filteredBridge = filterPoints$1(bridge, bridge.next);
    filterPoints$1(bridgeReverse, bridgeReverse.next);

    // Check if input node was removed by the filtering
    return outerNode === bridge ? filteredBridge : outerNode;
}

// David Eberly's algorithm for finding a bridge between hole and outer polygon
function findHoleBridge$1(hole, outerNode) {
    var p = outerNode,
        hx = hole.x,
        hy = hole.y,
        qx = -Infinity,
        m;

    // find a segment intersected by a ray from the hole's leftmost point to the left;
    // segment's endpoint with lesser x will be potential connection point
    do {
        if (hy <= p.y && hy >= p.next.y && p.next.y !== p.y) {
            var x = p.x + ((hy - p.y) * (p.next.x - p.x)) / (p.next.y - p.y);
            if (x <= hx && x > qx) {
                qx = x;
                if (x === hx) {
                    if (hy === p.y) return p;
                    if (hy === p.next.y) return p.next;
                }
                m = p.x < p.next.x ? p : p.next;
            }
        }
        p = p.next;
    } while (p !== outerNode);

    if (!m) return null;

    if (hx === qx) return m; // hole touches outer segment; pick leftmost endpoint

    // look for points inside the triangle of hole point, segment intersection and endpoint;
    // if there are no points found, we have a valid connection;
    // otherwise choose the point of the minimum angle with the ray as connection point

    var stop = m,
        mx = m.x,
        my = m.y,
        tanMin = Infinity,
        tan;

    p = m;

    do {
        if (
            hx >= p.x &&
            p.x >= mx &&
            hx !== p.x &&
            pointInTriangle$1(
                hy < my ? hx : qx,
                hy,
                mx,
                my,
                hy < my ? qx : hx,
                hy,
                p.x,
                p.y
            )
        ) {
            tan = Math.abs(hy - p.y) / (hx - p.x); // tangential

            if (
                locallyInside$1(p, hole) &&
                (tan < tanMin ||
                    (tan === tanMin &&
                        (p.x > m.x ||
                            (p.x === m.x && sectorContainsSector$1(m, p)))))
            ) {
                m = p;
                tanMin = tan;
            }
        }

        p = p.next;
    } while (p !== stop);

    return m;
}

// whether sector in vertex m contains sector in vertex p in the same coordinates
function sectorContainsSector$1(m, p) {
    return area$1(m.prev, m, p.prev) < 0 && area$1(p.next, m, m.next) < 0;
}

// interlink polygon nodes in z-order
function indexCurve$1(start, minX, minY, invSize) {
    var p = start;
    do {
        if (p.z === null) p.z = zOrder$1(p.x, p.y, minX, minY, invSize);
        p.prevZ = p.prev;
        p.nextZ = p.next;
        p = p.next;
    } while (p !== start);

    p.prevZ.nextZ = null;
    p.prevZ = null;

    sortLinked$1(p);
}

// Simon Tatham's linked list merge sort algorithm
// http://www.chiark.greenend.org.uk/~sgtatham/algorithms/listsort.html
function sortLinked$1(list) {
    var i,
        p,
        q,
        e,
        tail,
        numMerges,
        pSize,
        qSize,
        inSize = 1;

    do {
        p = list;
        list = null;
        tail = null;
        numMerges = 0;

        while (p) {
            numMerges++;
            q = p;
            pSize = 0;
            for (i = 0; i < inSize; i++) {
                pSize++;
                q = q.nextZ;
                if (!q) break;
            }
            qSize = inSize;

            while (pSize > 0 || (qSize > 0 && q)) {
                if (pSize !== 0 && (qSize === 0 || !q || p.z <= q.z)) {
                    e = p;
                    p = p.nextZ;
                    pSize--;
                } else {
                    e = q;
                    q = q.nextZ;
                    qSize--;
                }

                if (tail) tail.nextZ = e;
                else list = e;

                e.prevZ = tail;
                tail = e;
            }

            p = q;
        }

        tail.nextZ = null;
        inSize *= 2;
    } while (numMerges > 1);

    return list;
}

// z-order of a point given coords and inverse of the longer side of data bbox
function zOrder$1(x, y, minX, minY, invSize) {
    // coords are transformed into non-negative 15-bit integer range
    x = 32767 * (x - minX) * invSize;
    y = 32767 * (y - minY) * invSize;

    x = (x | (x << 8)) & 0x00ff00ff;
    x = (x | (x << 4)) & 0x0f0f0f0f;
    x = (x | (x << 2)) & 0x33333333;
    x = (x | (x << 1)) & 0x55555555;

    y = (y | (y << 8)) & 0x00ff00ff;
    y = (y | (y << 4)) & 0x0f0f0f0f;
    y = (y | (y << 2)) & 0x33333333;
    y = (y | (y << 1)) & 0x55555555;

    return x | (y << 1);
}

// find the leftmost node of a polygon ring
function getLeftmost$1(start) {
    var p = start,
        leftmost = start;
    do {
        if (p.x < leftmost.x || (p.x === leftmost.x && p.y < leftmost.y))
            leftmost = p;
        p = p.next;
    } while (p !== start);

    return leftmost;
}

// check if a point lies within a convex triangle
function pointInTriangle$1(ax, ay, bx, by, cx, cy, px, py) {
    return (
        (cx - px) * (ay - py) - (ax - px) * (cy - py) >= 0 &&
        (ax - px) * (by - py) - (bx - px) * (ay - py) >= 0 &&
        (bx - px) * (cy - py) - (cx - px) * (by - py) >= 0
    );
}

// check if a diagonal between two polygon nodes is valid (lies in polygon interior)
function isValidDiagonal$1(a, b) {
    return (
        a.next.i !== b.i &&
        a.prev.i !== b.i &&
        !intersectsPolygon$1(a, b) && // dones't intersect other edges
        ((locallyInside$1(a, b) &&
        locallyInside$1(b, a) &&
        middleInside$1(a, b) && // locally visible
            (area$1(a.prev, a, b.prev) || area$1(a, b.prev, b))) || // does not create opposite-facing sectors
            (equals$1(a, b) &&
                area$1(a.prev, a, a.next) > 0 &&
                area$1(b.prev, b, b.next) > 0))
    ); // special zero-length case
}

// signed area of a triangle
function area$1(p, q, r) {
    return (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
}

// check if two points are equal
function equals$1(p1, p2) {
    return p1.x === p2.x && p1.y === p2.y;
}

// check if two segments intersect
function intersects$1(p1, q1, p2, q2) {
    var o1 = sign$1(area$1(p1, q1, p2));
    var o2 = sign$1(area$1(p1, q1, q2));
    var o3 = sign$1(area$1(p2, q2, p1));
    var o4 = sign$1(area$1(p2, q2, q1));

    if (o1 !== o2 && o3 !== o4) return true; // general case

    if (o1 === 0 && onSegment$1(p1, p2, q1)) return true; // p1, q1 and p2 are collinear and p2 lies on p1q1
    if (o2 === 0 && onSegment$1(p1, q2, q1)) return true; // p1, q1 and q2 are collinear and q2 lies on p1q1
    if (o3 === 0 && onSegment$1(p2, p1, q2)) return true; // p2, q2 and p1 are collinear and p1 lies on p2q2
    if (o4 === 0 && onSegment$1(p2, q1, q2)) return true; // p2, q2 and q1 are collinear and q1 lies on p2q2

    return false;
}

// for collinear points p, q, r, check if point q lies on segment pr
function onSegment$1(p, q, r) {
    return (
        q.x <= Math.max(p.x, r.x) &&
        q.x >= Math.min(p.x, r.x) &&
        q.y <= Math.max(p.y, r.y) &&
        q.y >= Math.min(p.y, r.y)
    );
}

function sign$1(num) {
    return num > 0 ? 1 : num < 0 ? -1 : 0;
}

// check if a polygon diagonal intersects any polygon segments
function intersectsPolygon$1(a, b) {
    var p = a;
    do {
        if (
            p.i !== a.i &&
            p.next.i !== a.i &&
            p.i !== b.i &&
            p.next.i !== b.i &&
            intersects$1(p, p.next, a, b)
        )
            return true;
        p = p.next;
    } while (p !== a);

    return false;
}

// check if a polygon diagonal is locally inside the polygon
function locallyInside$1(a, b) {
    return area$1(a.prev, a, a.next) < 0
        ? area$1(a, b, a.next) >= 0 && area$1(a, a.prev, b) >= 0
        : area$1(a, b, a.prev) < 0 || area$1(a, a.next, b) < 0;
}

// check if the middle point of a polygon diagonal is inside the polygon
function middleInside$1(a, b) {
    var p = a,
        inside = false,
        px = (a.x + b.x) / 2,
        py = (a.y + b.y) / 2;
    do {
        if (
            p.y > py !== p.next.y > py &&
            p.next.y !== p.y &&
            px < ((p.next.x - p.x) * (py - p.y)) / (p.next.y - p.y) + p.x
        )
            inside = !inside;
        p = p.next;
    } while (p !== a);

    return inside;
}

// link two polygon vertices with a bridge; if the vertices belong to the same ring, it splits polygon into two;
// if one belongs to the outer ring and another to a hole, it merges it into a single ring
function splitPolygon$1(a, b) {
    var a2 = new Node$1(a.i, a.x, a.y),
        b2 = new Node$1(b.i, b.x, b.y),
        an = a.next,
        bp = b.prev;

    a.next = b;
    b.prev = a;

    a2.next = an;
    an.prev = a2;

    b2.next = a2;
    a2.prev = b2;

    bp.next = b2;
    b2.prev = bp;

    return b2;
}

// create a node and optionally link it with previous one (in a circular doubly linked list)
function insertNode$1(i, x, y, last) {
    var p = new Node$1(i, x, y);

    if (!last) {
        p.prev = p;
        p.next = p;
    } else {
        p.next = last.next;
        p.prev = last;
        last.next.prev = p;
        last.next = p;
    }
    return p;
}

function removeNode$1(p) {
    p.next.prev = p.prev;
    p.prev.next = p.next;

    if (p.prevZ) p.prevZ.nextZ = p.nextZ;
    if (p.nextZ) p.nextZ.prevZ = p.prevZ;
}

function Node$1(i, x, y) {
    // vertex index in coordinates array
    this.i = i;

    // vertex coordinates
    this.x = x;
    this.y = y;

    // previous and next vertex nodes in a polygon ring
    this.prev = null;
    this.next = null;

    // z-order curve value
    this.z = null;

    // previous and next nodes in z-order
    this.prevZ = null;
    this.nextZ = null;

    // indicates whether this is a steiner point
    this.steiner = false;
}

// return a percentage difference between the polygon area and its triangulation area;
// used to verify correctness of triangulation
earcut$1.deviation = function(data, holeIndices, dim, triangles) {
    var hasHoles = holeIndices && holeIndices.length;
    var outerLen = hasHoles ? holeIndices[0] * dim : data.length;

    var polygonArea = Math.abs(signedArea$1(data, 0, outerLen, dim));
    if (hasHoles) {
        for (var i = 0, len = holeIndices.length; i < len; i++) {
            var start = holeIndices[i] * dim;
            var end = i < len - 1 ? holeIndices[i + 1] * dim : data.length;
            polygonArea -= Math.abs(signedArea$1(data, start, end, dim));
        }
    }

    var trianglesArea = 0;
    for (i = 0; i < triangles.length; i += 3) {
        var a = triangles[i] * dim;
        var b = triangles[i + 1] * dim;
        var c = triangles[i + 2] * dim;
        trianglesArea += Math.abs(
            (data[a] - data[c]) * (data[b + 1] - data[a + 1]) -
                (data[a] - data[b]) * (data[c + 1] - data[a + 1])
        );
    }

    return polygonArea === 0 && trianglesArea === 0
        ? 0
        : Math.abs((trianglesArea - polygonArea) / polygonArea);
};

function signedArea$1(data, start, end, dim) {
    var sum = 0;
    for (var i = start, j = end - dim; i < end; i += dim) {
        sum += (data[j] - data[i]) * (data[i + 1] + data[j + 1]);
        j = i;
    }
    return sum;
}

// turn a polygon in a multi-dimensional array form (e.g. as in GeoJSON) into a form Earcut accepts
earcut$1.flatten = function(data) {
    var dim = data[0][0].length,
        result = { vertices: [], holes: [], dimensions: dim },
        holeIndex = 0;

    for (var i = 0; i < data.length; i++) {
        for (var j = 0; j < data[i].length; j++) {
            for (var d = 0; d < dim; d++) result.vertices.push(data[i][j][d]);
        }
        if (i > 0) {
            holeIndex += data[i - 1].length;
            result.holes.push(holeIndex);
        }
    }
    return result;
};

//多边形面积(vec3)
function calcArea(pointArray) {
    let indices = triangulation(pointArray);
    let s = 0;
    for (let i = 0; i < indices.length; i += 3) {
        let idx1 = indices[i];
        let idx2 = indices[i + 1];
        let idx3 = indices[i + 2];
        let point1 = pointArray[idx1];
        let point2 = pointArray[idx2];
        let point3 = pointArray[idx3];
        let edge1 = calcEdge(point1, point2);
        let edge2 = calcEdge(point2, point3);
        let edge3 = calcEdge(point3, point1);
        s += calHeron(edge1, edge2, edge3);
    }
    return s;
}

//分割多边形,用耳切法生成索引
function triangulation(pointArray) {
    let vec3 = [];
    for (let i = 0; i < pointArray.length; i++) {
        vec3.push(pointArray[i].x);
        vec3.push(pointArray[i].y);
        vec3.push(pointArray[i].z);
    }
    let originIndices = earcut$1(vec3, null, 3);
    let indices = new Uint16Array(originIndices.length);
    for (let i = 0; i < originIndices.length; i++) {
        indices[i] = originIndices[i];
    }
    return indices;
}

//计算两点边长(vec3)
function calcEdge(pointA, pointB) {
    let x2 = Math.pow(pointA.x - pointB.x, 2);
    let y2 = Math.pow(pointA.y - pointB.y, 2);
    let z2 = Math.pow(pointA.z - pointB.z, 2);
    return Math.sqrt(x2 + y2 + z2);
}

//海伦公式（三边长求三角形面积）
function calHeron(a, b, c) {
    let p = (a + b + c) / 2;
    return Math.sqrt(p * (p - a) * (p - b) * (p - c));
}

//向量求夹角
function calcAngle(pointA, pointB, pointC) {
    let AB = Li.Vector3.subtract(pointB, pointA);
    let BC = Li.Vector3.subtract(pointB, pointC);

    let v1 = AB.normalize();
    let v2 = BC.normalize();

    let dot = Li.Vector3.dot(v1, v2);
    let angle = (Math.acos(dot) * 180.0) / Math.PI;
    return angle;
}
/**
 * 使用绝对或相对公差测试确定两个值是否相等。
 * 这有助于避免在直接比较浮点值时由于舍入错误而产生的问题。
 * 首先使用绝对公差测试比较这些值。
 * 如果失败，则执行相对公差测试。如果您不确定左右的大小，请使用此测试。
 *
 * @param {Number} left 第一个要比较的值.
 * @param {Number} right 另一个要比较的值.
 * @param {Number} [relativeEpsilon=0] 相对公差测试的左和右之间的最大包容增量。
 * @param {Number} [absoluteEpsilon=relativeEpsilon] 绝对公差测试的左和右之间的最大包容增量。
 * @returns {Boolean} 如果值在ε内相等，则为真；否则，为false
 * @private
 * @example
 * const a = equalsEpsilon(0.0, 0.01, 0.01); // true
 * const b = equalsEpsilon(0.0, 0.1, 0.01);  // false
 */
function equalsEpsilon(left, right, relativeEpsilon, absoluteEpsilon) {
    relativeEpsilon = relativeEpsilon || 0.0;
    absoluteEpsilon = absoluteEpsilon || relativeEpsilon;
    const absDiff = Math.abs(left - right);
    return (
        absDiff <= absoluteEpsilon ||
        absDiff <= relativeEpsilon * Math.max(Math.abs(left), Math.abs(right))
    );
}

//绘制柱状拉伸体
function extrudeEntity({
    points,
    height,
    color,
    opacity = 1,
    castShadow = false,
    waterShader = false,
    objectName,
    tag,
    onTerrian,
}) {
    let scene = window.GlobalViewer.scene;
    //水平cart3集合
    let outer = new Li.Cartesian3Vector();
    points.forEach((point) => {
        if (onTerrian) {
            point = point.toCartographic();
            point.height = 0;
        }
        outer.push_back(point.toCartesian3());
    });
    //拉伸体对象
    let extrudeEntity = new Li.ExtrudeEntity();
    extrudeEntity.setOuter(outer);
    extrudeEntity.extrudeHeight = height;
    extrudeEntity.create();
    //着色
    color = color16ToRgb(color);
    extrudeEntity.color = Li.Color.fromRgb(color.r, color.g, color.b, 255);
    extrudeEntity.waterShader = waterShader;
    let entity = extrudeEntity.createEntity();
    entity.travalRenderers(function (renderer) {
        if (castShadow == true) {
            renderer.castShadow = true;
        }
        renderer.material.opacity = opacity;
    });

    if (objectName) {
        entity.objectName = objectName;
    }
    if (tag != undefined) {
        entity.tag = tag + "";
    }
    //加入场景
    scene.addEntity(entity);
    outer.delete();
    extrudeEntity.delete();
    return entity;
}

//vector3偏移
function vector3Offset(
    point,
    { offsetX = 0, offsetY = 0, offsetZ = 0 },
    rotation,
    scale = 1
) {
    let scene = window.GlobalViewer.scene;
    let globe = scene.globe;
    let vec3 = Li.Vector3.create(offsetX, offsetY, offsetZ);
    let localToWorld = globe.ellipsoid.eastNorthUpToFixedFrame(
        point.toCartesian3()
    );
    if (rotation) {
        let localMatrix = Li.Matrix4.fromTranslationRotationScale(
            Li.Vector3.create(0, 0, 0),
            rotation.toRotationMatrix(),
            Li.Vector3.create(scale, scale, scale)
        );
        localToWorld = Li.Matrix4.multiply(localToWorld, localMatrix);
    }
    let newPoint = Li.Matrix4.multiplyByVector3(localToWorld, vec3);
    return newPoint;
}
//标准化vector3数组
function normalizeVec3Array(points) {
    points = points.map((point) => {
        let newPoint = null;
        if (point instanceof Li.Vector3) {
            newPoint = point;
        } else if (Array.isArray(point)) {
            let cart = Li.Cartographic.fromDegrees(
                point[0],
                point[1],
                point[2] || 0
            );
            newPoint = cart.toVector3();
        } else {
            newPoint = Li.Vector3.create(point.x, point.y, point.z);
        }
        return newPoint;
    });
    return points;
}
//标准化geojson二维数组
function normalizeJsonArray(points) {
    if (Array.isArray(points[0])) {
        return points;
    }
    points = points.map((point) => {
        let newPoint = null;
        if (point instanceof Li.Cartographic) {
            newPoint = point;
        } else if (point instanceof Li.Vector3) {
            newPoint = point.toCartographic();
        } else {
            newPoint = Li.Vector3.create(point.x, point.y, point.z);
            newPoint = newPoint.toCartographic();
        }
        newPoint = newPoint.toDegrees();
        return [newPoint.longitude, newPoint.latitude];
    });
    return points;
}
//vector3 转 卡托角度
function vec3ToDegrees(vec3) {
    let carto = vec3.toCartographic();
    return carto.toDegrees();
}
//获取屏幕中心点
function getScreenCenter() {
    if (!window.GlobalViewer) {
        return;
    }
    let camera = window.GlobalViewer.scene.mainCamera;
    var hit = new Li.RaycastHit(); //射线投影
    //屏幕坐标 xy
    var canvasE = Module.qtCanvasElements[0] || window.GlobalViewer.canvasEl;
    var ray = camera.screenPointToRay(
        canvasE.offsetWidth / 2,
        canvasE.offsetHeight / 2
    );
    window.GlobalViewer.scene.raycast(ray, hit);
    let point = null;
    if (hit) {
        //获取单击点中的信息
        point = hit.point; //Vector3
    }
    return point;
}

//拾取单击鼠标空间坐标
function pickClickPoint(fn) {
    let qtCanvas = document.getElementById("qtcanvas");
    let clickEvent = function (e) {
        let posX = e.x;
        let posY = e.y;
        let scene = window.GlobalViewer.scene;
        let ray = scene.mainCamera.screenPointToRay(posX, posY);
        let hit = new Li.RaycastHit();
        if (scene.raycast(ray, hit)) {
            let point = hit.point;
            fn.call(this, point);
        }
        hit.delete();
        qtCanvas.removeEventListener("click", clickEvent);
    };
    qtCanvas.addEventListener("click", clickEvent);
}
//将提供的笛卡尔分量乘以提供的标量
//Cartesian3
function multiplyByScalarToCartesian3(cartesian, scalar) {
    let result = {};
    if (typeof cartesian !== "object") {
        return;
    }
    if (typeof scalar !== "number") {
        return;
    }
    if (cartesian && scalar) {
        result.x = cartesian.x * scalar;
        result.y = cartesian.y * scalar;
        result.z = cartesian.z * scalar;
    }
    return result;
}
/**
 * 比较提供的Cartesian组件，
 * 如果通过绝对或相对公差测试，
 * 则返回true，否则返回false。
 *
 * @param {Cartesian3} [left] 第一个笛卡尔。
 * @param {Cartesian3} [right] 第二个笛卡尔。
 * @param {Number} [relativeEpsilon=0] 用于相等测试的相对ε公差。
 * @param {Number} [absoluteEpsilon=relativeEpsilon] 用于相等测试的绝对ε公差。
 * @returns {Boolean} 如果左和右在提供的epsilon内，则为true，否则为false。
 * @private
 */
function equalsEpsilonToCartesian3(
    left,
    right,
    relativeEpsilon,
    absoluteEpsilon
) {
    let lbol = defined(left);
    let rbol = defined(right);
    let equalsno = left === right;
    let incrementX = equalsEpsilon(
        left.x,
        right.x,
        relativeEpsilon,
        absoluteEpsilon
    );
    let incrementY = equalsEpsilon(
        left.y,
        right.y,
        relativeEpsilon,
        absoluteEpsilon
    );
    let incrementZ = equalsEpsilon(
        left.z,
        right.z,
        relativeEpsilon,
        absoluteEpsilon
    );
    return equalsno || (lbol && rbol && incrementX && incrementY && incrementZ);
}
//判断是否为空
function defined(value) {
    return value !== undefined && value !== null;
}
/**
 * 按分量比较提供的矩阵，
 * 如果它们在提供的epsilon内，
 * 则返回true，否则返回false。
 *
 * @param {Matrix4} [left] 第一个矩阵.
 * @param {Matrix4} [right] 第二个矩阵.
 * @param {Number} [epsilon=0] 用于相等测试的epsilon。
 * @returns {Boolean} 如果左和右在提供的epsilon内，则为true，否则为false。
 * @private
 *
 */
function equalsEpsilonToMatrix4(left, right, epsilon) {
    epsilon = epsilon || 0;
    let newleft = Matrix4ToArray(left);
    let newright = Matrix4ToArray(right);
    return (
        newleft === newright ||
        (defined(newleft) &&
            defined(newright) &&
            Math.abs(newleft[0] - newright[0]) <= epsilon &&
            Math.abs(newleft[1] - newright[1]) <= epsilon &&
            Math.abs(newleft[2] - newright[2]) <= epsilon &&
            Math.abs(newleft[3] - newright[3]) <= epsilon &&
            Math.abs(newleft[4] - newright[4]) <= epsilon &&
            Math.abs(newleft[5] - newright[5]) <= epsilon &&
            Math.abs(newleft[6] - newright[6]) <= epsilon &&
            Math.abs(newleft[7] - newright[7]) <= epsilon &&
            Math.abs(newleft[8] - newright[8]) <= epsilon &&
            Math.abs(newleft[9] - newright[9]) <= epsilon &&
            Math.abs(newleft[10] - newright[10]) <= epsilon &&
            Math.abs(newleft[11] - newright[11]) <= epsilon &&
            Math.abs(newleft[12] - newright[12]) <= epsilon &&
            Math.abs(newleft[13] - newright[13]) <= epsilon &&
            Math.abs(newleft[14] - newright[14]) <= epsilon &&
            Math.abs(newleft[15] - newright[15]) <= epsilon)
    );
}
//4*4矩阵转换成数组
function Matrix4ToArray(Matrix4) {
    let newMatrix4 = [];
    for (let i = 0; i < 4; i++) {
        let valx = Matrix4.column(i).x;
        let valy = Matrix4.column(i).y;
        let valz = Matrix4.column(i).z;
        let valw = Matrix4.column(i).w;
        newMatrix4.push(valx);
        newMatrix4.push(valy);
        newMatrix4.push(valz);
        newMatrix4.push(valw);
    }
    return newMatrix4;
}
/**
 * 获取可用于测量事件间隔时间的时间戳。
 * 时间戳以毫秒表示，但未指定从何处测量毫秒。
 * 此函数使用performance.now()（如果可用）
 * 否则为Date.now()。
 *
 * @function getTimestamp
 *
 * @returns {Number} The timestamp in milliseconds since some unspecified reference time.
 * @private
 */
function getTimestamp() {
    return Date.now();
}

function initEvents(vm) {
    vm._events = Object.create(null);
}
function mixinEvents(Fn) {
    Fn.prototype.$on = function (event, fn) {
        const vm = this;
        if (Array.isArray(event)) {
            for (let i = 0, l = event.length; i < l; i++) {
                vm.$on(event[i], fn);
            }
        } else {
            (vm._events[event] || (vm._events[event] = [])).push(fn);
        }
        return vm;
    };
    Fn.prototype.$once = function (event, fn) {
        const vm = this;
        function on() {
            vm.$off(event, on);
            fn.apply(vm, arguments);
        }
        on.fn = fn;
        vm.$on(event, on);
        return vm;
    };
    Fn.prototype.$off = function (event, fn) {
        const vm = this;
        // all
        if (!arguments.length) {
            vm._events = Object.create(null);
            return vm;
        }
        // array of events
        if (Array.isArray(event)) {
            for (let i = 0, l = event.length; i < l; i++) {
                vm.$off(event[i], fn);
            }
            return vm;
        }
        // specific event
        const cbs = vm._events[event];
        if (!cbs) {
            return vm;
        }
        if (!fn) {
            vm._events[event] = null;
            return vm;
        }
        // specific handler
        let cb;
        let i = cbs.length;
        while (i--) {
            cb = cbs[i];
            if (cb === fn || cb.fn === fn) {
                cbs.splice(i, 1);
                break;
            }
        }
        return vm;
    };
    Fn.prototype.$emit = function (event) {
        const vm = this;
        let cbs = vm._events[event];
        if (cbs) {
            cbs = cbs.length > 1 ? toArray(cbs) : cbs;
            const args = toArray(arguments, 1);
            for (let i = 0, l = cbs.length; i < l; i++) {
                let handler = cbs[i];
                args ? handler.apply(vm, args) : handler.call(vm);
            }
        }
        return vm;
    };
}

function global$r(Li, viewer) {
    /**
     * @description 测量对象
     * @constructor
     * @alias Measure
     * @param {Object} options -参数
     * @param {String} options.type -测量类型
     *   |可选值       | 描述        |
     *   |--------     |--------    |
     *   |  line       | 距离       |
     *   |  area       | 面积       |
     *   |  height     | 高度       |
     *   |  angle      | 角度       |
     *   |  volume     | 体积       |
     *   |  coordinate | 坐标       |
     */
    function Measure(options) {
        this._options = options;
        this.initData(options);
        initEvents(this);
    }
    mixinEvents(Measure);
    Measure.prototype.initData = function (options) {
        let message =
            options.type == "coordinate"
                ? "左键获取坐标"
                : "左键获取，右键结束";
        this.cache = {
            distance: 0,
            points: [],
            helperPoints: [],
            labelList: [],
            list: [],
        };
        this.mearsureType = options.type;
        this.initTooltip(message);
        this.initEvent(options);
    };
    Measure.prototype.initEvent = function () {
        let cache = this.cache;
        if (cache.mousedown) {
            return;
        }
        let qtCanvas = viewer.canvasEl;
        let mousedown = this.mousedownEvent.bind(this);
        let mousemove = this.mousemoveEvent.bind(this);
        cache.mousedown = mousedown;
        cache.mousemove = mousemove;
        qtCanvas.style.cursor = "crosshair";
        qtCanvas.addEventListener("mousedown", mousedown);
        document.addEventListener("mousemove", mousemove);
    };
    Measure.prototype.mousedownEvent = function (e) {
        let cache = this.cache;
        // 单击鼠标左键开始绘图
        if (e.button == 0) {
            cache.drawing = true;
            let posX = e.x;
            let posY = e.y;
            let scene = viewer.scene;
            //相机在鼠标点的射线
            let ray = scene.mainCamera.screenPointToRay(posX, posY);
            //新建射线碰撞对象
            let hit = new Li.RaycastHit();
            //raycast 拾取物体
            if (scene.raycast(ray, hit)) {
                let point = hit.point; //vec3
                //测量体积 —— 第二次左键单击结束
                if (cache.volumeMoving) {
                    this.calcVolume(cache.volume); //计算体积
                    this.removeMouseEvent();
                    this.$emit("end", "volume");
                    return;
                }
                //绘制单点坐标
                if (this.mearsureType == "coordinate") {
                    this.drawCoordinate(point);
                    this.removeMouseEvent();
                    this.$emit("end", "coordinate");
                    return;
                }
                //绘制连接线
                if (!cache.polyline) {
                    cache.polyline = this.createPolyline3d();
                    cache.list.push(cache.polyline); //收集绘图对象
                }
                cache.polyline.addPoint(point);
                //绘制鼠标单击圆点
                this.drawClickPoint(this.mearsureType, point);
                cache.points.push(point);

                //绘制高度差文字标签
                if (this.mearsureType == "height" && cache.points.length == 2) {
                    //最后三点夹角
                    let pointA = cache.points[0];
                    let pointB = cache.points[1];
                    let positionA = pointA.toCartographic();
                    let positionB = pointB.toCartographic();

                    let offsetHeight = Math.abs(
                        positionB.height - positionA.height
                    );
                    let text = " 高度差:" + offsetHeight.toFixed(1) + "米 ";
                    let label = this.drawLabel3d({
                        name: "height",
                        position: cache.points[1],
                        text: text,
                    });
                    cache.labelList.push(label);
                    this.removeMouseEvent();
                    this.$emit("end", "height");
                    return;
                }

                //绘制距离文字标签
                if (this.mearsureType == "line" && cache.points.length >= 2) {
                    //最后两点水平距离
                    let distance = Li.Cartesian3.distance(
                        cache.points[cache.points.length - 2].toCartesian3(),
                        cache.points[cache.points.length - 1].toCartesian3()
                    );
                    //总距离
                    cache.distance += distance;
                    let text = " " + cache.distance.toFixed(1) + "m ";
                    let label = this.drawLabel3d({
                        name: "line",
                        position: point,
                        text: text,
                    });
                    cache.labelList.push(label);
                }

                //绘制角度文字标签
                if (this.mearsureType == "angle" && cache.points.length >= 3) {
                    //最后三点夹角
                    let angle = calcAngle(
                        cache.points[cache.points.length - 3],
                        cache.points[cache.points.length - 2],
                        cache.points[cache.points.length - 1]
                    );
                    let text = " " + angle.toFixed(1) + "度 ";
                    let label = this.drawLabel3d({
                        name: "angle",
                        position: cache.points[cache.points.length - 2],
                        text: text,
                    });
                    cache.labelList.push(label);
                }
            }
            hit.delete();
        }
        //右键事件
        if (e.button == 2 && cache.drawing && !cache.volumeMoving) {
            if (this.mearsureType == "line" && cache.points.length < 2) {
                return;
            }
            if (this.mearsureType != "line" && cache.points.length < 3) {
                return;
            }
            this.rightMouseEvent();
        }
    };
    Measure.prototype.mousemoveEvent = function (e) {
        let cache = this.cache;
        let posX = e.x;
        let posY = e.y;
        let tooltip = this.tooltip;
        tooltip.style.display = "block";
        tooltip.style.left = posX + 5 + "px";
        tooltip.style.top = posY + 5 + "px";
        if (cache.points.length == 0) {
            return;
        }
        let scene = viewer.scene;
        let ray = scene.mainCamera.screenPointToRay(posX, posY);
        let hit = new Li.RaycastHit();
        if (scene.raycast(ray, hit)) {
            let point = hit.point;
            //lineTo绘制动态点，只取最后一次调用坐标
            cache.polyline.lineTo(point);
            //体积拉伸
            if (cache.volumeMoving) {
                //清除上一次移动生成的mesh
                if (cache.volume) {
                    cache.volume.delete();
                    cache.volume = null;
                }
                let height = point.toCartographic().height;
                let volume = extrudeEntity({
                    points: cache.points,
                    height: height,
                    // opacity: 0.8,
                    color: "#00ffff",
                });
                volume.extrudeHeight = height; //绘制体积标签时用到
                cache.volume = volume;
                scene.addEntity(volume);
                volume.name = "volume";
                return;
            }
            //绘制多边形
            if (
                this.mearsureType != "line" &&
                this.mearsureType != "angle" &&
                cache.points.length > 1
            ) {
                this.drawPolygon3d(point);
            }
        }
        hit.delete();
    };
    Measure.prototype.removeMouseEvent = function (type) {
        let cache = this.cache;
        let qtCanvas = viewer.canvasEl;
        if (cache.mousedown) {
            qtCanvas.removeEventListener("mousedown", cache.mousedown);
            cache.mousedown = null;
        }
        if (cache.mousemove) {
            document.removeEventListener("mousemove", cache.mousemove);
            cache.mousemove = null;
        }
        qtCanvas.style.cursor = "default";
        cache.drawing = false;
        this.removeTooltip();
    };
    Measure.prototype.rightMouseEvent = function () {
        let cache = this.cache;
        let point =
            this.mearsureType == "line" || this.mearsureType == "angle"
                ? cache.points[cache.points.length - 1]
                : cache.points[0];
        cache.polyline.addPoint(point);
        cache.polyline.draw();
        cache.polyline.end();
        if (this.mearsureType == "line") {
            this.$emit("end", "line");
        }
        if (this.mearsureType == "angle") {
            this.$emit("end", "angle");
        }
        if (this.mearsureType != "line" && this.mearsureType != "angle") {
            //体积
            if (this.mearsureType == "volume") {
                //生成透明体，用于鼠标移动获取高度
                if (!cache.alphaVolume) {
                    let alphaVolume = extrudeEntity({
                        points: cache.points,
                        height: 2000,
                        color: "#000000",
                        opacity: 0,
                    });
                    //收集缓存对象
                    cache.alphaVolume = alphaVolume;
                    alphaVolume.name = "alphaVolume";
                    cache.volumeMoving = true;
                }
                this.tooltip.innerText = "移动拉伸，左键结束";
                //清除辅助点和多边形
                cache.helperPoints.forEach((item) => {
                    item.delete();
                });
                cache.helperPoints = [];
                cache.polygon3d.delete();
                cache.polygon3d = null;
                return;
            } else {
                this.drawPolygon3d();
                cache.list.push(cache.polygon3d); //收集绘图对象
                cache.polygon3d = null;
            }
            //计算多边形面积
            let area = calcArea(cache.points);
            //计算多边形中心点
            let centerPoint = this.getCenterPoint(cache.points);
            //标签
            let text = " 面积：" + area.toFixed(1) + "m² ";
            let label = this.drawLabel3d({
                name: "area",
                position: centerPoint,
                text: text,
            });
            cache.labelList.push(label);
            this.$emit("end", "area");
        }
        if (this.mearsureType != "volume") {
            this.removeMouseEvent();
        }
    };
    Measure.prototype.initTooltip = function (message) {
        let elem = document.createElement("div");
        elem.innerText = message;
        elem.style.cssText = `
            position: absolute;
            left: 0;
            top: 0;
            display: none;
            padding: 3px 6px;
            color: #fff;
            background-color: rgba(20, 20, 20, 0.6);
            font-size: 12px;
        `;
        document.body.appendChild(elem);
        this.tooltip = elem;
    };
    Measure.prototype.removeTooltip = function () {
        if (this.tooltip) {
            document.body.removeChild(this.tooltip);
            this.tooltip = null;
        }
    };
    Measure.prototype.drawClickPoint = function (name, point, key) {
        let cache = this.cache;
        let bbEntity = new Li.BillboardEntity();
        bbEntity.position = point;
        bbEntity.url = SSmap$1.$baseUrl + "/assets/images/circle.png";
        bbEntity.vertical = true;
        bbEntity.imageWidth = 10;
        bbEntity.imageHeight = 10;
        if (name) {
            bbEntity.objectName = name;
            if (key) {
                cache.helperPoints.splice(key, 0, bbEntity);
            } else {
                cache.helperPoints.push(bbEntity);
            }
        }
        if (cache.billboardCollection == null) {
            cache.billboardCollection = new Li.BillboardCollection();
            cache.list.push(cache.billboardCollection);
        }
        bbEntity.setCollection(cache.billboardCollection);
    };
    Measure.prototype.drawLabel3d = function ({
        name,
        position,
        url,
        text,
        imageWidth,
        imageHeight,
        fontSize,
        color,
        background,
    }) {
        let cache = this.cache;
        let label = new Li.Label3D();
        label.name = name;
        label.position = position;
        label.text = text;
        label.fontSize = fontSize || 11;
        label.fontColor = color || Li.Color.fromRgb(0, 0, 0, 255);
        label.background = background || Li.Color.fromRgb(255, 255, 255, 255);
        if (url) {
            label.url = url;
            label.imageWidth = imageWidth;
            label.imageHeight = imageHeight;
        }
        if (cache.billboardCollection == null) {
            let bbcollection = new Li.BillboardCollection();
            cache.billboardCollection = bbcollection;
            cache.list.push(cache.billboardCollection);
        }
        label.setCollection(cache.billboardCollection);
        return label;
    };
    Measure.prototype.createPolyline3d = function (lineWidth, color) {
        let polyline = new Li.Polyline3D();
        polyline.setWidth(lineWidth || 2.5);
        polyline.color = color || Li.Color.fromRgb(252, 20, 20, 255);
        polyline.setAltitudeMethod(Li.AltitudeMethod.Absolute);
        return polyline;
    };
    Measure.prototype.createPolygon3d = function () {
        let polygon3d = new Li.Polygon3D();
        polygon3d.color = Li.Color.fromRgb(0, 0, 0, 128);
        polygon3d.alpha = 0.5;
        polygon3d.fillAlpha = 0.6;
        polygon3d.setFillColor(Li.Color.fromRgb(255, 255, 255, 56));
        return polygon3d;
    };
    Measure.prototype.drawPolygon3d = function (point) {
        let cache = this.cache;
        //清除移动鼠标上一次绘制的多边形
        if (cache.polygon3d) {
            cache.polygon3d.delete();
            cache.polygon3d = null;
        }
        //绘制新的多边形
        let polygon3d = this.createPolygon3d();
        cache.polygon3d = polygon3d;
        cache.points.forEach((item) => {
            polygon3d.addPoint(item);
        });
        if (point) {
            polygon3d.addPoint(point);
        }
        polygon3d.draw();
        polygon3d.end();
    };
    Measure.prototype.drawCoordinate = function (point) {
        let cache = this.cache;
        let carto = point.toCartographic();
        let deg = carto.toDegrees();
        let longitude = deg.longitude.toFixed(6);
        let latitude = deg.latitude.toFixed(6);
        let text = " 经度：" + longitude + " <br/> " + " 纬度：" + latitude;
        //dom标签
        let elem = new SSmap$1.DomPopover({
            type: 1,
            position: {
                longitude: deg.longitude,
                latitude: deg.latitude,
                height: deg.height,
            },
            text,
        });
        cache.labelElem = elem;
    };
    Measure.prototype.getCenterPoint = function (pointArray) {
        let lonlist = [];
        let latlist = [];
        let heightList = [];
        pointArray.forEach((item) => {
            let point = item.toCartographic().toDegrees();
            lonlist.push(point.longitude);
            latlist.push(point.latitude);
            heightList.push(point.height);
        });
        let minlon = Math.min(...lonlist);
        let maxlon = Math.max(...lonlist);
        let minlat = Math.min(...latlist);
        let maxlat = Math.max(...latlist);
        let minHeight = Math.min(...heightList);
        let maxHeight = Math.max(...heightList);
        let longitude = (minlon + maxlon) / 2;
        let latitude = (minlat + maxlat) / 2;
        let height = (minHeight + maxHeight) / 2;
        let point = Li.Cartographic.fromDegrees(longitude, latitude, height);
        return point.toVector3();
    };
    Measure.prototype.calcVolume = function (mesh) {
        let cache = this.cache;
        let renderer = mesh.renderer;
        let boundingSphere = renderer.boundingVolume.boundingSphere;
        let position = vector3Offset(boundingSphere.center, {
            offsetZ: mesh.extrudeHeight / 2,
        });
        let f = Li.GisUtil.calculateGeometryVolume(renderer); //调用计算体积函数（异步）
        f.then((value) => {
            let text = " 体积：" + value.toFixed(1).toString() + "m³ ";
            this.drawLabel3d({
                name: "volume",
                position: position,
                text: text,
            });
        });
        for (let i = 0; i < cache.list.length; i++) {
            let item = cache.list[i];
            if (item instanceof Li.Polyline3D) {
                item.delete();
                cache.list.splice(i, 1);
                break;
            }
        }
        cache.list.push(cache.volume);
        cache.volume = null;
        cache.alphaVolume.delete();
        cache.alphaVolume = null;
    };
    /**
     * @description 移除
     */
    Measure.prototype.remove = function () {
        let cache = this.cache;
        cache.polygon3d && cache.polygon3d.delete();
        cache.alphaVolume && cache.alphaVolume.delete();
        cache.volume && cache.volume.delete();
        cache.labelElem && cache.labelElem.remove();
        let cacheList = [
            ...cache.helperPoints,
            ...cache.labelList,
            ...cache.list,
        ];
        cacheList.forEach((instance) => {
            instance.delete();
        });
        this.removeMouseEvent();
        this.cache = {
            distance: 0,
            points: [],
            helperPoints: [],
            labelList: [],
            list: [],
        };
    };
    return Measure;
}

var skylineFS = `#version 300 es
    precision highp float;
    precision highp sampler2D;

    layout(location = 0) out vec4 FragColor;

    in vec2 v_textureCoordinates;

    uniform sampler2D colorTexture;
    uniform sampler2D depthTexture;
    uniform float u_width;
    uniform vec4 u_color;
    const float MAX_DEPTH_VALUE = 16777216.0;

    void main()
    {
        ivec2 uv = ivec2(gl_FragCoord.xy);
            
        // const float MAX_DEPTH_VALUE = 16777216.0;
        float fMinDepth = MAX_DEPTH_VALUE;
        float fMaxDepth = 0.0;

        ivec2 texSize = ivec2(textureSize(depthTexture, 0).xy);

        float samples = ceil((u_width + 1.0) / 2.0);

        for (float y = -samples; y <= samples; ++y) 
        {
            for (float x = -samples; x <= samples; ++x) 
            {
                ivec2 st = clamp(uv+ivec2(x, y), ivec2(0), texSize-1);
                float fDepth = texelFetch(depthTexture, st, 0).x;
                fMinDepth = min(fMinDepth, fDepth);
                fMaxDepth = max(fMaxDepth, fDepth);
            }
        }

        bool isEdge = false;//uv.x == 0 || uv.x == texSize.x-1 || uv.y == 0 || uv.y == texSize.y-1;

        float fEdge = float(!isEdge && fMinDepth < MAX_DEPTH_VALUE && fMaxDepth == MAX_DEPTH_VALUE);
        
        vec4 color = texture(colorTexture, v_textureCoordinates);
        FragColor = vec4(mix(color.rgb, u_color.rgb, fEdge), 1.0);
    }
`;

function global$q(Li, viewer) {
    let instance = null;
    /**
     * @description 天际线
     * @constructor
     * @alias analyse.Skyline
     * @param {Object} options -参数
     * @param {Function} [options.toImage] -生成图片(回调函数返回url)
     * @param {Number} [options.width=1] -线宽
     * @param {String} [options.color=#ff0000] -颜色
     */
    function Skyline(options) {
        //单例模式
        if (instance && !options.toImage) {
            return instance;
        } else {
            let defaults = {
                toImage: "",
                width: 1,
                color: "#FF0000",
            };
            this._options = mergeOptions(defaults, options);
            this.create(this._options);
            instance = this;
        }
    }
    Skyline.prototype.create = function (options) {
        let width = options.width;
        let color = options.color;
        color = color16ToRgb(color);
        color = Li.Color.fromRgb(color.r, color.g, color.b, 255);
        if (this._options.toImage) {
            this.renderImage(width, color);
        } else {
            this.renderPoster(width, color);
        }
    };
    Skyline.prototype.renderPoster = function (width, color) {
        let material = new Li.Material();
        material.shaderProgram =
            Li.ShaderProgram.createViewportQuadShader(skylineFS);
        material.setParameterFloat("u_width", width);
        material.setParameterColor("u_color", color);
        let postProcess = new Li.PostProcess();
        postProcess.material = material;
        viewer.renderSystem.addPostProcess(postProcess);
        this.material = material;
        this.postProcess = postProcess;
    };
    Skyline.prototype.renderImage = function (width, color) {
        let renderSystem = viewer.renderSystem;
        renderSystem.renderSkyline(920, 200, width, color).then((byteArray) => {
            let typedArray = Li.ByteArray.fromPtr(byteArray).data();
            let data = new Uint8Array(typedArray);
            let blob = new Blob([data], {
                type: "image/png",
            });
            let url = URL.createObjectURL(blob);
            this._options.toImage.call(this, url);
        });
    };
    /**
     * @description 移除
     */
    Skyline.prototype.remove = function () {
        if (!this._options.toImage) {
            this.material.delete();
            this.postProcess.delete();
        }
    };

    Object.defineProperties(Skyline.prototype, {
        /**
         * 颜色
         * @memberof analyse.Skyline.prototype
         * @type {String}
         */
        color: {
            get() {
                return this._options.color;
            },
            set(val) {
                this._options.color = val;
                let color = color16ToRgb(val);
                this.material.setParameterColor(
                    "u_color",
                    Li.Color.fromRgb(color.r, color.g, color.b, 255)
                );
            },
        },
        /**
         * 线宽
         * @memberof analyse.Skyline.prototype
         * @type {Number}
         */
        width: {
            get() {
                return this._options.width;
            },
            set(val) {
                this._options.width = val;
                this.material.setParameterFloat("u_width", val);
            },
        },
    });
    return Skyline;
}

function global$p(Li, viewer) {
    /**
     * @description 通视分析
     * @constructor
     * @alias analyse.Sightline
     * @param {Object} options -参数
     * @param {Number} [options.offetHeight=1.7] -偏移高度（m）
     */
    function Sightline(options) {
        let defaults = {
            offetHeight: 1.7,
        };
        this._options = mergeOptions(defaults, options);
        initEvents(this);
        this.initData();
    }
    mixinEvents(Sightline);
    Sightline.prototype.initData = function () {
        this.cache = {
            points: [],
            helperPoints: [],
            labelList: [],
            list: [],
        };
        this.draw();
    };
    Sightline.prototype.draw = function () {
        let that = this;
        let cache = this.cache;
        let index = 0;
        let message = "单击开始绘制";
        let polyline = new SSmap$1.graphic.Polyline({
            style: {
                color: "#0099ff",
            },
        });
        let tooltip = polyline.tooltip;
        tooltip.innerText = message;
        polyline.$on("step", function (_, point) {
            tooltip.innerText = "单击开始分析";
            that.drawClickPoint("sightline", point);
            let offsetHeight = that._options.offsetHeight;
            if (index == 0 && offsetHeight != 0) {
                let carto = point.toCartographic();
                carto.height += offsetHeight;
                point = carto.toVector3();
            }
            cache.points.push(point);
            if (++index == 2) {
                this.end();
                this.remove();
                let texts = [" 观察位置 ", " 目标点 "];
                for (let i = 0; i < texts.length; i++) {
                    let text = texts[i];
                    let label = that.drawLabel3d({
                        name: "sightline",
                        position: cache.points[i],
                        text: text,
                    });
                    cache.labelList.push(label);
                }
                that.analyse();
            }
        });
    };
    Sightline.prototype.drawClickPoint = function (name, point, key) {
        let cache = this.cache;
        let bbEntity = new Li.BillboardEntity();
        bbEntity.position = point;
        bbEntity.url = SSmap$1.$baseUrl + "/assets/images/circle.png";
        bbEntity.vertical = true;
        bbEntity.imageWidth = 10;
        bbEntity.imageHeight = 10;
        if (name) {
            bbEntity.objectName = name;
            if (key) {
                cache.helperPoints.splice(key, 0, bbEntity);
            } else {
                cache.helperPoints.push(bbEntity);
            }
        }
        if (cache.billboardCollection == null) {
            cache.billboardCollection = new Li.BillboardCollection();
            cache.list.push(cache.billboardCollection);
        }
        bbEntity.setCollection(cache.billboardCollection);
    };
    Sightline.prototype.drawLabel3d = function ({
        name,
        position,
        url,
        text,
        imageWidth,
        imageHeight,
        fontSize,
        color,
        background,
    }) {
        let cache = this.cache;
        let label = new Li.Label3D();
        label.name = name;
        label.position = position;
        label.text = text;
        label.fontSize = fontSize || 11;
        label.fontColor = color || Li.Color.fromRgb(0, 0, 0, 255);
        label.background = background || Li.Color.fromRgb(255, 255, 255, 255);
        if (url) {
            label.url = url;
            label.imageWidth = imageWidth;
            label.imageHeight = imageHeight;
        }
        if (cache.billboardCollection == null) {
            let bbcollection = new Li.BillboardCollection();
            cache.billboardCollection = bbcollection;
            cache.list.push(cache.billboardCollection);
        }
        label.setCollection(cache.billboardCollection);
        return label;
    };
    Sightline.prototype.analyse = function () {
        let cache = this.cache;
        let start = cache.points[0];
        let end = cache.points[1];
        let AB = Li.Vector3.subtract(end, start);
        AB = AB.normalize();
        let scalar = Li.Vector3.multiplyByScalar(AB, 0.1);
        let newPoint = Li.Vector3.add(start, scalar);
        let ray = Li.Ray.create(newPoint, AB);
        let hit = new Li.RaycastHit();
        let scene = viewer.scene;
        if (scene.raycast(ray, hit)) {
            let point = hit.point;
            let polyline1 = new SSmap$1.graphic.Polyline({
                positions: [start, point],
                style: {
                    color: "#00FF00",
                },
            });
            let polyline2 = new SSmap$1.graphic.Polyline({
                positions: [point, end],
                style: {
                    color: "#FF0000",
                },
            });
            cache.list.push(polyline1.instance, polyline2.instance);
        }
        hit.delete();
    };
    /**
     * @description 移除
     */
    Sightline.prototype.remove = function () {
        let cache = this.cache;
        let cacheList = [
            ...cache.helperPoints,
            ...cache.labelList,
            ...cache.list,
        ];
        cacheList.forEach((instance) => {
            instance.delete();
        });
        this.cache = {
            distance: 0,
            points: [],
            helperPoints: [],
            labelList: [],
            list: [],
        };
    };
    return Sightline;
}

function global$o(Li, viewer) {
    /**
     * @description 三维场景中的裁切体，裁切体内的一切实体都不显示。
     * @constructor
     * @alias analyse.ClipBox
     * @param {Object} options -参数
     * @param {Object} options.position -裁切中心位置
     * @param {Number} options.position.longitude -经度
     * @param {Number} options.position.latitude -纬度
     * @param {Number} options.position.height -高度
     * @param {String} [options.direction=null] -裁切方向
     *   |可选值       | 描述       |
     *   |--------     |--------   |
     *   |  up         | 顶部       |
     *   |  down       | 底部       |
     *   |  east       | 东面       |
     *   |  west       | 西面       |
     *   |  north      | 北面       |
     *   |  south      | 南面       |
     * @param {Object} options.size -裁切盒子尺寸(diection==null时必选)
     * @param {Number} options.size.x -笛卡尔x坐标(长)
     * @param {Number} options.size.y -笛卡尔y坐标(宽)
     * @param {Number} options.size.z -笛卡尔z坐标(高)
     * @param {Number} [options.radius=0] -裁切面半径(diection!=null时必选)
     * @param {Number} [options.distance=0] -方向裁切时距离
     * @param {Boolean} [options.debugBox=true] -调试线或面
     */
    function ClipBox(options) {
        let defaults = {
            debugBox: true,
        };
        this.cache = {
            list: [],
        };
        this._options = mergeOptions(defaults, options);
        if (options.direction) {
            this._position = JSON.stringify(options.position); //保存初始位置
            this.initData(this._options);
        }
        /**
         * Li.ClipVolume实例对象.
         * @type {Object}
         */
        this.instance = this.create(this._options);
    }
    ClipBox.prototype.initData = function (options) {
        let carto = Li.Cartographic.fromDegrees(
            options.position.longitude,
            options.position.latitude,
            options.position.height
        );
        let vec3 = carto.toVector3();
        let deg = null;
        options.distance = options.distance || 0.001; //最小size
        switch (options.direction) {
            case "top":
                options.position.height += options.radius;
                options.position.height -= options.distance / 2;
                options.size = {
                    x: options.radius,
                    y: options.radius,
                    z: options.distance / 2,
                };
                break;
            case "bottom":
                options.position.height -= options.radius;
                options.position.height += options.distance / 2;
                options.size = {
                    x: options.radius,
                    y: options.radius,
                    z: options.distance / 2,
                };
                break;
            case "east":
                vec3 = vector3Offset(vec3, {
                    offsetX: options.radius - options.distance / 2,
                });
                deg = vec3ToDegrees(vec3);
                options.position = {
                    longitude: deg.longitude,
                    latitude: deg.latitude,
                    height: deg.height,
                };
                options.size = {
                    x: options.distance / 2,
                    y: options.radius,
                    z: options.radius,
                };
                break;
            case "west":
                vec3 = vector3Offset(vec3, {
                    offsetX: -options.radius + options.distance / 2,
                });
                deg = vec3ToDegrees(vec3);
                options.position = {
                    longitude: deg.longitude,
                    latitude: deg.latitude,
                    height: deg.height,
                };
                options.size = {
                    x: options.distance / 2,
                    y: options.radius,
                    z: options.radius,
                };
                break;
            case "north":
                vec3 = vector3Offset(vec3, {
                    offsetY: options.radius - options.distance / 2,
                });
                deg = vec3ToDegrees(vec3);
                options.position = {
                    longitude: deg.longitude,
                    latitude: deg.latitude,
                    height: deg.height,
                };
                options.size = {
                    x: options.radius,
                    y: options.distance / 2,
                    z: options.radius,
                };
                break;
            case "south":
                vec3 = vector3Offset(vec3, {
                    offsetY: -options.radius + options.distance / 2,
                });
                deg = vec3ToDegrees(vec3);
                options.position = {
                    longitude: deg.longitude,
                    latitude: deg.latitude,
                    height: deg.height,
                };
                options.size = {
                    x: options.radius,
                    y: options.distance / 2,
                    z: options.radius,
                };
                break;
        }
    };
    ClipBox.prototype.create = function (options) {
        let scene = viewer.scene;
        let position = Li.Cartographic.fromDegrees(
            options.position.longitude,
            options.position.latitude,
            options.position.height
        );
        let size = options.size;
        let cv = new Li.ClipVolume();
        cv.shape = Li.ClipVolumeShape.Cube; //剪切形状立方体
        cv.clipFlag = Li.ClipVolumeFlag.ClipScene;
        cv.size = Li.Vector3.create(size.x, size.y, size.z);
        cv.showDebugVolume = false;
        cv.objectName = "clipVolume";

        let entity = new Li.Entity();
        entity.transform.cartographic = position;
        let childEntity = new Li.Entity();
        childEntity.parent = entity;
        let quaternion;
        if (options.rotation) {
            quaternion = Li.Quaternion.fromEulerAngles(
                options.rotation.x || 0,
                options.rotation.y || 0,
                options.rotation.z || 0
            );
            childEntity.transform.rotation = quaternion; //旋转角度(四元数)
        }
        childEntity.addComponent(cv);
        scene.addEntity(entity);
        this._childEntity = childEntity;
        this._entity = entity;
        if (options.debugBox) {
            this.drawDebugBox(position, size, quaternion);
        }
        return cv;
    };
    /**
     * @description 转变
     * @param {Object} options -参数
     * @param {Object} [options.position=null] -位置
     * @param {Number} options.position.longitude -经度
     * @param {Number} options.position.latitude -纬度
     * @param {Number} options.position.height -高度
     * @param {Object} [options.size=null] -尺寸
     * @param {Number} options.size.x -笛卡尔坐标x
     * @param {Number} options.size.y -笛卡尔坐标y
     * @param {Number} options.size.z -笛卡尔坐标Z
     * @param {Object} [options.rotation=null] -角度
     * @param {Number} options.rotation.x -笛卡尔角度x
     * @param {Number} options.rotation.y -笛卡尔角度y
     * @param {Number} options.rotation.z -笛卡尔角度Z
     */
    ClipBox.prototype.transform = function (options) {
        this._options = mergeOptions(this._options, options);
        if (options.position) {
            let position = Li.Cartographic.fromDegrees(
                options.position.longitude,
                options.position.latitude,
                options.position.height
            );
            this._entity.transform.cartographic = position;
        }
        if (options.rotation) {
            let quaternion;
            quaternion = Li.Quaternion.fromEulerAngles(
                options.rotation.x || 0,
                options.rotation.y || 0,
                options.rotation.z || 0
            );
            this._childEntity.transform.rotation = quaternion;
        }
        if (options.size) {
            this.instance.size = Li.Vector3.create(
                options.size.x,
                options.size.y,
                options.size.z
            );
        }
        if (this._options.debugBox) {
            let position = this._options.position;
            position = Li.Cartographic.fromDegrees(
                position.longitude,
                position.latitude,
                position.height
            );
            let rotation = this._options.rotation;
            if (rotation) {
                rotation = Li.Quaternion.fromEulerAngles(
                    rotation.x || 0,
                    rotation.y || 0,
                    rotation.z || 0
                );
            }
            this.removeDebugBox();
            this.drawDebugBox(position, this._options.size, rotation);
        }
    };
    ClipBox.prototype.drawDebugBox = function (position, size, rotation) {
        let point = position.toVector3();
        let leftTop1 = vector3Offset(
            point,
            {
                offsetX: -size.x,
                offsetY: size.y,
                offsetZ: size.z,
            },
            rotation
        );
        let rightTop1 = vector3Offset(
            point,
            {
                offsetX: size.x,
                offsetY: size.y,
                offsetZ: size.z,
            },
            rotation
        );
        let rightBottom1 = vector3Offset(
            point,
            {
                offsetX: size.x,
                offsetY: -size.y,
                offsetZ: size.z,
            },
            rotation
        );
        let leftBottom1 = vector3Offset(
            point,
            {
                offsetX: -size.x,
                offsetY: -size.y,
                offsetZ: size.z,
            },
            rotation
        );
        let leftTop2 = vector3Offset(
            point,
            {
                offsetX: -size.x,
                offsetY: size.y,
                offsetZ: -size.z,
            },
            rotation
        );
        let rightTop2 = vector3Offset(
            point,
            {
                offsetX: size.x,
                offsetY: size.y,
                offsetZ: -size.z,
            },
            rotation
        );
        let rightBottom2 = vector3Offset(
            point,
            {
                offsetX: size.x,
                offsetY: -size.y,
                offsetZ: -size.z,
            },
            rotation
        );
        let leftBottom2 = vector3Offset(
            point,
            {
                offsetX: -size.x,
                offsetY: -size.y,
                offsetZ: -size.z,
            },
            rotation
        );
        if (this._options.direction) {
            let points = [];
            switch (this._options.direction) {
                case "top":
                    points = [leftTop2, rightTop2, rightBottom2, leftBottom2];
                    break;
                case "bottom":
                    points = [leftTop1, rightTop1, rightBottom1, leftBottom1];
                    break;
                case "east":
                    points = [leftTop1, leftBottom1, leftBottom2, leftTop2];
                    break;
                case "west":
                    points = [rightTop1, rightBottom1, rightBottom2, rightTop2];
                    break;
                case "north":
                    points = [
                        leftBottom1,
                        rightBottom1,
                        rightBottom2,
                        leftBottom2,
                    ];
                    break;
                case "south":
                    points = [leftTop1, rightTop1, rightTop2, leftTop2];
                    break;
            }
            this.drawPolygon3d(points);
        } else {
            let polyline1 = new SSmap$1.graphic.Polyline(
                {
                    positions: [leftTop1, rightTop1, rightBottom1, leftBottom1],
                    closePath: true,
                    style: {
                        color: "#00FF00",
                        lineWidth: 1,
                    },
                },
                rotation
            );
            let polyline2 = new SSmap$1.graphic.Polyline(
                {
                    positions: [leftTop2, rightTop2, rightBottom2, leftBottom2],
                    closePath: true,
                    style: {
                        color: "#00FF00",
                        lineWidth: 1,
                    },
                },
                rotation
            );
            let polyline3 = new SSmap$1.graphic.Polyline(
                {
                    positions: [leftTop1, leftTop2],
                    style: {
                        color: "#00FF00",
                        lineWidth: 1,
                    },
                },
                rotation
            );
            let polyline4 = new SSmap$1.graphic.Polyline(
                {
                    positions: [rightTop1, rightTop2],
                    style: {
                        color: "#00FF00",
                        lineWidth: 1,
                    },
                },
                rotation
            );
            let polyline5 = new SSmap$1.graphic.Polyline(
                {
                    positions: [rightBottom1, rightBottom2, rightBottom1],
                    style: {
                        color: "#00FF00",
                        lineWidth: 1,
                    },
                },
                rotation
            );
            let polyline6 = new SSmap$1.graphic.Polyline(
                {
                    positions: [leftBottom1, leftBottom2],
                    style: {
                        color: "#00FF00",
                        lineWidth: 1,
                    },
                },
                rotation
            );
            this.cache.list.push(
                ...[
                    polyline1,
                    polyline2,
                    polyline3,
                    polyline4,
                    polyline5,
                    polyline6,
                ]
            );
        }
    };
    ClipBox.prototype.drawPolygon3d = function (points) {
        let cache = this.cache;
        if (cache.polygon3d) {
            cache.polygon3d.delete();
            cache.polygon3d = null;
        }
        let polygon3d = new Li.Polygon3D();
        polygon3d.color = Li.Color.fromRgb(0, 125, 255, 255);
        polygon3d.alpha = 0.7;
        polygon3d.fillAlpha = 0.1;
        polygon3d.setFillColor(Li.Color.fromRgb(0, 125, 255, 255));
        polygon3d.setAltitudeMethod(Li.AltitudeMethod.Absolute);
        cache.polygon3d = polygon3d;
        points.forEach((item) => {
            let point = Li.Vector3.create(item.x, item.y, item.z);
            polygon3d.addPoint(point);
        });
        polygon3d.draw();
        polygon3d.end();
    };
    ClipBox.prototype.removeDebugBox = function () {
        this.cache.list.forEach((instance) => {
            instance.remove();
        });
        if (this.cache.polygon3d) {
            this.cache.polygon3d.delete();
        }
        this.cache = {
            list: [],
        };
    };
    /**
     * @description 移除
     */
    ClipBox.prototype.remove = function () {
        if (this.instance) {
            this.instance.delete();
            this.instance = null;
        }
        if (this._entity) {
            this._entity.delete();
            this._entity = null;
        }
        if (this._options.debugBox) {
            this.removeDebugBox();
        }
    };
    Object.defineProperties(ClipBox.prototype, {
        /**
         * 方向裁剪距离
         * @memberof analyse.ClipBox.prototype
         * @type {Number}
         */
        distance: {
            get() {
                let size = this._options.distance;
                return size.z;
            },
            set(val) {
                let direction = this._options.direction;
                if (direction) {
                    this._options.position = JSON.parse(this._position);
                    this._options.distance = val;
                    this.initData(this._options);
                    this.transform({
                        position: this._options.position,
                        size: this._options.size,
                    });
                }
            },
        },
        /**
         * 调试线或面
         * @memberof analyse.ClipBox.prototype
         * @type {Boolean}
         */
        debugBox: {
            get() {
                return this._options.debugBox;
            },
            set(val) {
                this._options.debugBox = val;
                if (val) {
                    let position = this._options.position;
                    position = Li.Cartographic.fromDegrees(
                        position.longitude,
                        position.latitude,
                        position.height
                    );
                    let rotation = this._options.rotation;
                    if (rotation) {
                        rotation = Li.Quaternion.fromEulerAngles(
                            rotation.x || 0,
                            rotation.y || 0,
                            rotation.z || 0
                        );
                    }
                    this.drawDebugBox(position, this._options.size, rotation);
                } else {
                    this.removeDebugBox();
                }
            },
        },
    });
    return ClipBox;
}

function global$n(Li, viewer) {
    /**
     * @description 淹没分析
     * @constructor
     * @alias analyse.Flood
     * @param {Object} options -参数
     * @param {String} [options.type=circle] -淹没范围几何类型
     *   |可选值       | 描述        |
     *   |--------     |--------    |
     *   |  circle     | 环形       |
     *   |  rect       | 矩形       |
     *   |  polygon    | 多边形     |
     * @param {Number} [options.levelMeters=20] -地形网格精度（米）
     * @param {String} [options.color=#007BE6] -范围面颜色
     * @param {Number} [options.speed=5] -淹没速度
     */
    function Flood(options) {
        let defaults = {
            type: "circle",
            height: 0,
            minHeight: 0,
            maxHeight: 0,
            levelMeters: 20,
            speed: 5,
            color: "#007BE6",
        };
        this._options = mergeOptions(defaults, options);
        initEvents(this);
        this.initData();
    }
    mixinEvents(Flood);
    Flood.prototype.initData = function () {
        this._polygon = this.drawPolygon();
    };
    Flood.prototype.drawPolygon = function () {
        let that = this;
        let polygon = new SSmap$1.graphic.Polygon({
            type: this._options.type,
            style: {
                mode: "OnTerrain",
                color: this._options.color,
                alpha: 0.1,
                fillAlpha: 0.5,
            },
        });
        polygon.$on("end", function () {
            setTimeout(() => {
                that.$emit("calc-start");
            }, 0);
            that.getHeightRange(this.cache.points);
        });
        return polygon;
    };
    Flood.prototype.drawVolume = function (points) {
        let volume = new SSmap$1.graphic.ExtrudeEntity({
            positions: points,
            style: {
                height: this.height,
                color: "#053966",
                baseHeight: 0,
                waterShader: true,
                opacity: 0.35,
            },
        });
        return volume;
    };
    // Flood.prototype.getHeightRange = function (points) {
    //     let bbox = this.getBBox(points);
    //     let radian = Math.PI / 180;
    //     let longRange = bbox[1] - bbox[0];
    //     let latRange = bbox[3] - bbox[2];
    //     let latToMeters = LatitudeToMeters(latRange * radian);
    //     let longToMeters = LongitudeToMeters(
    //         longRange * radian,
    //         latRange * radian
    //     );
    //     let latStep = parseInt(latToMeters / this._options.levelMeters);
    //     let longStep = parseInt(longToMeters / this._options.levelMeters);

    //     let indices = triangulation(points); //在for循环外做好耳切
    //     let pointVector = new Li.PointVector();
    //     let num = 0;
    //     for (let i = 0; i < longStep; i++) {
    //         for (let j = 0; j < latStep; j++) {
    //             let longitude = bbox[0] + (longRange / longStep) * i;
    //             let latitude = bbox[2] + (latRange / latStep) * j;
    //             let point = Li.Cartographic.fromDegrees(longitude, latitude, 0);
    //             point = point.toVector3();
    //             //判断bbox的点是否在有效范围内
    //             if (isPointInPolygon(point, points, indices)) {
    //                 pointVector.push_back(point);
    //                 num++;
    //             }
    //         }
    //     }
    //     console.log("地形网格数量：" + num);

    //     let future = Li.GisUtil.calculateMinMaxMean(
    //         pointVector,
    //         -200.0,
    //         2000.0,
    //         false
    //     );
    //     future.then((min, max) => {
    //         let minHeight = Number(min.toFixed(1));
    //         let maxHeight = Number(max.toFixed(1));
    //         this._options.minHeight = minHeight;
    //         this._options.maxHeight = maxHeight;
    //         setTimeout(() => {
    //             this.$emit("calc-end", minHeight, maxHeight);
    //         }, 0);
    //     });
    //     pointVector.delete();
    // };
    //Worker优化版
    Flood.prototype.getHeightRange = function (points) {
        let bbox = this.getBBox(points);
        let radian = Math.PI / 180;
        let longRange = bbox[1] - bbox[0];
        let latRange = bbox[3] - bbox[2];
        let latToMeters = LatitudeToMeters(latRange * radian);
        let longToMeters = LongitudeToMeters(
            longRange * radian,
            latRange * radian
        );
        let latStep = parseInt(latToMeters / this._options.levelMeters);
        let longStep = parseInt(longToMeters / this._options.levelMeters);
        let rectPoints = [];
        for (let i = 0; i < longStep; i++) {
            for (let j = 0; j < latStep; j++) {
                let longitude = bbox[0] + (longRange / longStep) * i;
                let latitude = bbox[2] + (latRange / latStep) * j;
                let point = Li.Cartographic.fromDegrees(longitude, latitude, 0);
                point = point.toVector3();
                let newPoint = {
                    x: point.x,
                    y: point.y,
                    z: point.z,
                };
                rectPoints.push(newPoint);
            }
        }
        //转json传入worker
        points = points.map((point) => {
            return {
                x: point.x,
                y: point.y,
                z: point.z,
            };
        });
        let pointVector = new Li.PointVector();
        let worker = new Worker(SSmap$1.$baseUrl + "/assets/range-worker.js", {});
        worker.postMessage({ rectPoints, points });
        worker.onmessage = (e) => {
            let points = e.data.points;
            points.forEach((point) => {
                point = Li.Vector3.create(point.x, point.y, point.z);
                pointVector.push_back(point);
            });

            let future = Li.GisUtil.calculateMinMaxMean(
                pointVector,
                -200.0,
                2000.0,
                false
            );
            future.then((min, max) => {
                let minHeight = Number(min.toFixed(1));
                let maxHeight = Number(max.toFixed(1));
                this._options.minHeight = minHeight;
                this._options.maxHeight = maxHeight;
                this.$emit("calc-end", minHeight, maxHeight);
            });
            pointVector.delete();
        };
    };
    Flood.prototype.getBBox = function (points) {
        let minX = Number.POSITIVE_INFINITY;
        let maxX = Number.NEGATIVE_INFINITY;
        let minY = Number.POSITIVE_INFINITY;
        let maxY = Number.NEGATIVE_INFINITY;
        points.forEach((point) => {
            let carto = point.toCartographic().toDegrees();
            minX = Math.min(minX, carto.longitude);
            maxX = Math.max(maxX, carto.longitude);
            minY = Math.min(minY, carto.latitude);
            maxY = Math.max(maxY, carto.latitude);
        });
        return [minX, maxX, minY, maxY];
    };
    /**
     * @description 开始淹没分析
     * @param {Boolean} [animation=true] -开启动态淹没分析
     */
    Flood.prototype.analyse = function (animation = true) {
        let polygon = this._polygon;
        if (polygon && this.height < this.maxHeight) {
            if (!this._points) {
                this._points = polygon.cache.points;
            }
            polygon.remove();
            polygon = this.drawVolume(this._points);
            this._polygon = polygon;
            if (animation) {
                this.animate();
            }
        }
    };
    Flood.prototype.animate = function () {
        this._animating = true;
        if (!this._frameAction) {
            let scene = viewer.scene;
            let frameAction = new Li.FrameAction();
            frameAction.onTriggered((delta) => {
                console.log("animate");
                if (!this._animating) {
                    this.$emit("animating", "pause");
                    return;
                }
                let distance = delta * this._options.speed;
                this._options.height += distance;
                this._polygon.height = this._options.height;
                if (this._options.height >= this._options.maxHeight) {
                    this._animating = false;
                    this.$emit("animating", "end");
                    frameAction.delete();
                    this._frameAction = null;
                } else {
                    this.$emit("animating", "running");
                }
            });
            scene.rootEntity.addComponent(frameAction);
            this._frameAction = frameAction;
        }
    };
    /**
     * @description 移除
     */
    Flood.prototype.remove = function () {
        if (this._polygon) {
            this._polygon.remove();
            this._polygon = null;
            this._points = null;
            if (this._frameAction) {
                this._frameAction.delete();
                this._frameAction = null;
                this._animating = false;
            }
        }
    };
    Object.defineProperties(Flood.prototype, {
        /**
         * 最低海拔
         * @memberof analyse.Flood.prototype
         * @type {Number}
         */
        minHeight: {
            get() {
                return this._options.minHeight;
            },
            set(val) {
                this._options.minHeight = val;
            },
        },
        /**
         * 最高海拔
         * @memberof analyse.Flood.prototype
         * @type {Number}
         */
        maxHeight: {
            get() {
                return this._options.maxHeight;
            },
            set(val) {
                this._options.maxHeight = val;
            },
        },
        /**
         * 淹没海拔
         * @memberof analyse.Flood.prototype
         * @type {Number}
         */
        height: {
            get() {
                return this._options.height;
            },
            set(val) {
                let min = this._options.minHeight;
                let max = this._options.maxHeight;
                this._options.height = Math.max(min, Math.min(val, max));
                if (this._polygon && !this.animating) {
                    this._polygon.height = this._options.height;
                }
            },
        },
        /**
         * 淹没速度
         * @memberof analyse.Flood.prototype
         * @type {Number}
         */
        speed: {
            get() {
                return this._options.speed;
            },
            set(val) {
                this._options.speed = val;
            },
        },
        /**
         * 动画状态
         * @memberof analyse.Flood.prototype
         * @type {Boolean}
         */
        animating: {
            get() {
                return this._animating;
            },
            set(val) {
                this._animating = val;
            },
        },
    });
    return Flood;
}

function global$m(Li, viewer) {
    /**
     * @description 缓冲分析
     * @constructor
     * @alias graphic.Billboard
     * @param {Object} options -参数
     * @param {String} [options.type=point] -缓冲类型
     *   |可选值       | 描述            |
     *   |--------     |--------        |
     *   |  point       | 点缓冲         |
     *   |  line        | 线缓冲         |
     *   |  polygon     | 面缓冲         |
     * @param {Object} [options.position=null] -点位置
     *   |可选值                                 | 描述               |
     *   |------------------------------------  |----------------    |
     *   |  [[longitude,latitude,height]]       |  经纬度坐标         |
     *   |   [{x:0,y:0,z:0}]                    | 笛卡尔坐标          |
     *   |  [SSmap.Vector3.create(x,y,z)]       | 底层SDK向量对象     |
     * @param {Object} options.style -样式
     * @param {String} [options.style.color=#FFFF00] -几何形状颜色
     * @param {String} [options.style.bufferColor=#FFFF00] -缓冲区域颜色
     * @param {Number} [options.style.bufferAlpha=0.5] -缓冲透明度
     * @param {Number} [options.style.radius] -缓冲半径（m)
     * @param {Number} [options.style.steps] -缓冲步伐
     */
    function Buffer(options) {
        this.turf = SSmap$1.turf || window.turf;
        if (!this.turf) {
            console.error("此实例依赖第三方库turf，请先引入turf.js");
            return;
        }
        let defaults = {
            type: "point",
            style: {
                color: "#FFFF00",
                bufferColor: "#FF0000",
                bufferAlpha: 0.5,
                radius: 50,
                steps: 89,
                units: "kilometers",
            },
        };
        this._options = mergeOptions(defaults, options);
        this.cache = {
            points: [],
            list: [],
        };
        initEvents(this);
        this.init(this._options);
    }
    mixinEvents(Buffer);
    Buffer.prototype.init = function (options) {
        let that = this;
        let cache = this.cache;
        let positions = options.positions;
        if (positions) {
            let points = normalizeVec3Array(positions);
            switch (this._options.type) {
                case "point":
                    this.drawPointBuffer(points[0]);
                    break;
                case "line":
                    let polyline = new SSmap$1.graphic.Polyline({
                        positions: positions,
                        style: {
                            color: "#FFFF00",
                        },
                    });
                    this.drawLineBuffer(points);
                    cache.list.push(polyline);
                    break;
                case "polygon":
                    let polygon = new SSmap$1.graphic.Polygon({
                        positions: positions,
                        style: {
                            color: "#FFFF00",
                            mode: "OnTerrain",
                            fillAlpha: 0.5,
                        },
                    });
                    this.drawPolygonBuffer(points);
                    cache.list.push(polygon);
                    break;
            }
        } else {
            switch (this._options.type) {
                case "point":
                    pickClickPoint((point) => {
                        this.drawPointBuffer(point);
                    });
                    break;
                case "line":
                    let polyline = new SSmap$1.graphic.Polyline({
                        style: {
                            color: "#FFFF00",
                        },
                    });
                    polyline.$on("end", function () {
                        that.drawLineBuffer(this.cache.points);
                    });
                    cache.list.push(polyline);
                    break;
                case "polygon":
                    let polygon = new SSmap$1.graphic.Polygon({
                        style: {
                            color: "#FFFF00",
                            mode: "OnTerrain",
                            fillAlpha: 0.5,
                        },
                    });
                    polygon.$on("end", function () {
                        let points = this.cache.points;
                        that.drawPolygonBuffer([...points, points[0]]);
                    });
                    cache.list.push(polygon);
                    break;
            }
        }
    };
    Buffer.prototype.drawPointBuffer = function (point) {
        let style = this._options.style;
        let cache = this.cache;
        let carto = point.toCartographic().toDegrees();
        let turf = this.turf;
        point = turf.point([carto.longitude, carto.latitude]);
        let buffer = turf.buffer(point, style.radius / 1000, {
            units: style.units,
            steps: style.steps,
        });
        let points = buffer.geometry.coordinates[0];
        let polygon1 = new SSmap$1.graphic.Polygon({
            positions: points,
            style: {
                mode: "OnTerrain",
                color: style.bufferColor,
                fillAlpha: style.bufferAlpha,
            },
        });
        buffer = turf.buffer(point, style.radius / 20000, {
            units: style.units,
            steps: style.steps,
        });
        points = buffer.geometry.coordinates[0];
        let polygon2 = new SSmap$1.graphic.Polygon({
            positions: points,
            style: {
                mode: "OnTerrain",
                color: style.color,
            },
        });
        cache.list.push(polygon1, polygon2);
        this.$emit("end", "point", point);
    };
    Buffer.prototype.drawLineBuffer = function (points) {
        let style = this._options.style;
        let cache = this.cache;
        let turf = this.turf;
        points = normalizeJsonArray(points);
        points = turf.lineString(points);
        let buffer = turf.buffer(points, style.radius / 1000, {
            units: style.units,
            steps: style.steps,
        });
        points = buffer.geometry.coordinates[0];
        let polygon = new SSmap$1.graphic.Polygon({
            positions: points,
            style: {
                color: style.bufferColor,
                fillAlpha: style.bufferAlpha,
                mode: "OnTerrain",
            },
        });
        cache.list.push(polygon);
    };
    Buffer.prototype.drawPolygonBuffer = function (points) {
        let style = this._options.style;
        let cache = this.cache;
        let turf = this.turf;
        points = normalizeJsonArray(points);
        points = turf.polygon([points]);
        let buffer = turf.buffer(points, style.radius / 1000, {
            units: style.units,
            steps: style.steps,
        });
        points = buffer.geometry.coordinates[0];
        let polygon = new SSmap$1.graphic.Polygon({
            positions: points,
            style: {
                color: style.bufferColor,
                fillAlpha: style.bufferAlpha,
                mode: "OnTerrain",
            },
        });
        cache.list.push(polygon);
    };
    /**
     * @description 移除
     */
    Buffer.prototype.remove = function () {
        let cache = this.cache;
        if (cache.list.length) {
            cache.list.forEach((instance) => {
                instance.remove();
            });
            cache = {
                points: [],
                list: [],
            };
        }
    };
    return Buffer;
}

function global$l(Li, viewer) {
    /**
     * @description 面运算
     * @constructor
     * @alias graphic.Topology
     * @param {Object} options -参数
     * @param {String} [options.type=intersect] -缓冲类型
     *   |可选值             | 描述            |
     *   |--------           |--------        |
     *   |  intersect        | 面求交         |
     *   |  union            | 面求并         |
     *   |  difference       | 面求差         |
     * @param {Object} [options.polygonA=null] -几何面A位置点集合
     *   |可选值                                 | 描述               |
     *   |------------------------------------  |----------------    |
     *   |  [[longitude,latitude,height]]       |  经纬度坐标         |
     *   |   [{x:0,y:0,z:0}]                    | 笛卡尔坐标          |
     *   |  [SSmap.Vector3.create(x,y,z)]       | 底层SDK向量对象     |
     * @param {Object} [options.polygonB=null] -几何面B位置点集合
     *   |可选值                                 | 描述               |
     *   |------------------------------------  |----------------    |
     *   |  [[longitude,latitude,height]]       |  经纬度坐标         |
     *   |   [{x:0,y:0,z:0}]                    | 笛卡尔坐标          |
     *   |  [SSmap.Vector3.create(x,y,z)]       | 底层SDK向量对象     |
     * @param {Object} options.style -样式
     */
    function Topology(options) {
        this.turf = SSmap$1.turf || window.turf;
        if (!this.turf) {
            console.error("此实例依赖第三方库turf，请先引入turf.js");
            return;
        }
        let defaults = {
            type: "intersect",
            style: {},
        };
        this._options = mergeOptions(defaults, options);
        this.cache = {
            points: [],
            list: [],
        };
        initEvents(this);
        this.init(this._options);
    }
    mixinEvents(Topology);
    Topology.prototype.init = function (options) {
        let cache = this.cache;
        let polygonA = options.polygonA;
        let polygonB = options.polygonB;
        if (polygonA && polygonB) {
            polygonA = new SSmap$1.graphic.Polygon({
                positions: polygonA,
                style: {
                    color: "#FF0000",
                    mode: "OnTerrain",
                    fillAlpha: 0.5,
                },
            });
            polygonB = new SSmap$1.graphic.Polygon({
                positions: polygonB,
                style: {
                    color: "#0000FF",
                    mode: "OnTerrain",
                    fillAlpha: 0.5,
                },
            });
            cache.list.push(polygonA, polygonB);
            this.calc(polygonA, polygonB);
        } else {
            this.drawPolygon("first");
        }
    };
    Topology.prototype.drawPolygon = function (key) {
        let that = this;
        let cache = this.cache;
        let polygon = new SSmap$1.graphic.Polygon({
            style: {
                color: key == "first" ? "#FF0000" : "#0000FF",
                mode: "OnTerrain",
                fillAlpha: 0.5,
            },
        });
        cache.list.push(polygon);
        polygon.$on("end", function () {
            let points = this.cache.points;
            points = normalizeJsonArray(points);
            if (key == "first") {
                that.$emit("first-end", points);
            } else {
                that.$emit("second-end", points);
                that.calc(...cache.list);
            }
        });
    };
    Topology.prototype.calc = function (polygonA, polygonB) {
        let cache = this.cache;
        let type = this._options.type;
        let turf = this.turf;
        let pointsA = normalizeJsonArray(polygonA.cache.points);
        pointsA = turf.polygon([[...pointsA, pointsA[0]]]);
        let pointsB = normalizeJsonArray(polygonB.cache.points);
        pointsB = turf.polygon([[...pointsB, pointsB[0]]]);
        let polygon = null;
        let points = null;
        switch (type) {
            case "intersect":
                points = turf.intersect(pointsA, pointsB);
                break;
            case "union":
                points = turf.union(pointsA, pointsB);
                break;
            case "difference":
                points = turf.difference(pointsA, pointsB);
                break;
        }
        if (points) {
            let coordinates = points.geometry.coordinates;
            coordinates = coordinates.length == 1 ? [coordinates] : coordinates;
            coordinates.forEach((arr) => {
                polygon = new SSmap$1.graphic.Polygon({
                    positions: arr[0],
                    style: {
                        borderWidth: 5,
                        borderColor: "#FFFFFF",
                        color: "#00FF00",
                        mode: "OnTerrain",
                        fillAlpha: 0.9,
                    },
                });
                cache.list.push(polygon);
            });
        }
        this.$emit("end", points);
    };
    Topology.prototype.remove = function () {
        let cache = this.cache;
        if (cache.list.length) {
            cache.list.forEach((instance) => {
                instance.remove();
            });
            cache = {
                points: [],
                list: [],
            };
        }
    };
    return Topology;
}

function global$k(Li, viewer) {
    /**
     * @description 坡向分析
     * @constructor
     * @alias analyse.Slope
     * @param {Object} options -参数
     * @param {Array} [options.positions=null] -范围点(最少3个点)
     *   |可选值                          | 描述               |
     *   |------------------------       |----------------    |
     *   |  [[longitude,latitude]]       |  经纬度坐标         |
     *   |   [{x:0,y:0,z:0}]             | 笛卡尔坐标          |
     *   |  [SSmap.Vector3.create(x,y,z)]   | 底层SDK向量对象     |
     * @param {Object} [options.style] -样式
     * @param {String} [options.style.color=#007BE6] -几何面颜色
     */
    function Slope(options) {
        let defaults = {
            type: "rect",
            style: {
                color: "#007BE6",
                fillAlpha: 0.5,
            },
        };
        this._options = mergeOptions(defaults, options);
        this.instance = null;
        initEvents(this);
        this.initData(this._options);
    }
    mixinEvents(Slope);
    Slope.prototype.initData = function (options) {
        let positions = options.positions;
        if (positions) {
            let points = normalizeVec3Array(positions);
            this.analyse(points);
        } else {
            this.drawPolygon();
        }
    };
    Slope.prototype.drawPolygon = function () {
        let that = this;
        let style = this._options.style;
        let polygon = new SSmap$1.graphic.Polygon({
            type: this._options.type,
            style: {
                mode: "OnTerrain",
                color: style.color,
                alpha: style.fillAlpha,
                fillAlpha: style.fillAlpha,
            },
        });
        polygon.$on("end", function () {
            that.analyse(this.cache.points);
            polygon.remove();
        });
        return polygon;
    };
    Slope.prototype.analyse = function (points) {
        let slopeAndAspect = new Li.SlopeAndAspect();
        points.forEach((point) => {
            slopeAndAspect.add(point);
        });
        slopeAndAspect.create();
        this.instance = slopeAndAspect;
        this.$emit("end", this._options.type);
    };
    /**
     * @description 移除
     */
    Slope.prototype.remove = function () {
        if (this.instance) {
            this.instance.delete();
            this.instance = null;
        }
    };
    return Slope;
}

function global$j(Li, viewer) {
    /**
     * @description 限高分析
     * @constructor
     * @alias analyse.LimitHeight
     * @param {Object} options -参数
     * @param {String} [options.type=rect] -限高范围几何类型
     *   |可选值       | 描述        |
     *   |--------     |--------    |
     *   |  circle     | 环形       |
     *   |  rect       | 矩形       |
     *   |  polygon    | 多边形     |
     * @param {Array} [options.positions=null] -范围点(最少3个点)
     *   |可选值                          | 描述               |
     *   |------------------------       |----------------    |
     *   |  [[longitude,latitude]]       |  经纬度坐标         |
     *   |   [{x:0,y:0,z:0}]             | 笛卡尔坐标          |
     *   |  [SSmap.Vector3.create(x,y,z)]   | 底层SDK向量对象     |
     * @param {Object} [options.style] -样式
     * @param {Number} [options.style.bottomHeight=1000] -近地面基点高度（米）
     * @param {Number} [options.style.height=0.1] -限制高度（米）
     * @param {String} [options.style.color=#ff0000] -限高颜色
     * @param {Number} [options.style.fillAlpha=0.7] -透明度
     */
    function LimitHeight(options) {
        let defaults = {
            type: "rect",
            positions: null,
            style: {
                color: "#ff0000",
                fillAlpha: 0.7,
                height: 0.1,
                bottomHeight: 1000,
            },
        };
        this._options = mergeOptions(defaults, options);
        /**
         * SSmap.Graphic.Polygon实例对象.
         * @type {Object}
         */
        this.instance = null;
        initEvents(this);
        this.initData(this._options);
    }
    mixinEvents(LimitHeight);
    LimitHeight.prototype.initData = function (options) {
        let positions = options.positions;
        if (positions) {
            let points = normalizeVec3Array(positions);
            this.analyse(points);
        } else {
            this.drawPolygon();
        }
    };
    LimitHeight.prototype.drawPolygon = function () {
        let that = this;
        let polygon = new SSmap$1.graphic.Polygon({
            type: this._options.type,
            style: {
                mode: "OnTerrain",
                color: "#ffff00",
                alpha: 0.3,
                fillAlpha: 0.3,
            },
        });
        polygon.$on("end", function () {
            polygon.remove();
            that.analyse(this.cache.points);
        });
    };
    LimitHeight.prototype.analyse = function (points) {
        let style = this._options.style;
        this.instance = new SSmap$1.graphic.Polygon({
            type: this._options.type,
            positions: points,
            style: {
                mode: "OnTerrain",
                color: style.color,
                alpha: style.fillAlpha,
                fillAlpha: style.fillAlpha,
                limitHeight: style.height,
                bottomHeight: style.bottomHeight,
            },
        });
    };
    /**
     * @description 移除
     */
    LimitHeight.prototype.remove = function () {
        if (this.instance) {
            this.instance.remove();
            this.instance = null;
        }
    };
    Object.defineProperties(LimitHeight.prototype, {
        /**
         * 限制高度
         * @memberof analyse.LimitHeight.prototype
         * @type {Number}
         */
        bottomHeight: {
            get() {
                return this.instance.instance.height();
            },
            set(val) {
                this.instance.instance.setHeight(val);
            },
        },
        /**
         * 近地面基点高度
         * @memberof analyse.LimitHeight.prototype
         * @type {Number}
         */
        height: {
            get() {
                return this.instance.instance.limitHeight();
            },
            set(val) {
                this.instance.instance.setLimitHeight(val);
            },
        },
    });
    return LimitHeight;
}

function global$i(Li, viewer) {
    /**
     * @description 可视域分析
     * @constructor
     * @alias analyse.ViewShed
     * @param {Object} options -参数
     * @param {Object} [options.position] -开始点位置
     *   |可选值                           | 描述               |
     *   |------------------------        |----------------    |
     *   |  [longitude,latitude,height]   |  经纬度坐标         |
     *   |   {x:0,y:0,z:0}                | 笛卡尔坐标          |
     *   |  SSmap.Vector3.create(x,y,z)   | 底层SDK向量对象     |
     * @param {Object} [options.endPoint] -结束点位置
     *   |可选值                           | 描述               |
     *   |------------------------        |----------------    |
     *   |  [longitude,latitude,height]   |  经纬度坐标         |
     *   |   {x:0,y:0,z:0}                | 笛卡尔坐标          |
     *   |  SSmap.Vector3.create(x,y,z)   | 底层SDK向量对象     |
     * @param {Object} [options.showDebugFrame=false] -开启调试线框
     * @param {Object} [options.style] -样式
     * @param {String} [options.style.horizontalAngle=120] -水平张角
     * @param {String} [options.style.verticalAngle=90] -垂直张角
     * @param {String} [options.style.offsetHeight=1.6] -坐标点增加高度值，规避遮挡
     * @param {String} [options.style.visibleColor=#00ff00] -可视部分颜色
     * @param {String} [options.style.invisibleColor=#00ff00] -不可视部分颜色
     */
    function ViewShed(options) {
        let defaults = {
            position: null,
            endPoint: null,
            showDebugFrame: false,
            style: {
                visibleColor: "#00ff00",
                invisibleColor: "#ff0000",
                horizontalAngle: 120,
                verticalAngle: 90,
                offsetHeight: 1.6,
            },
        };
        this._options = mergeOptions(defaults, options);
        this.instance = null;
        initEvents(this);
        this.initData(this._options);
    }
    mixinEvents(ViewShed);
    ViewShed.prototype.initData = function (options) {
        this.cache = {
            distance: 0,
            points: [],
            list: [],
        };
        let position = options.position;
        let endPoint = options.endPoint;
        if (position && endPoint) {
            position = normalizeVec3Array([position]);
            endPoint = normalizeVec3Array([endPoint]);
            this.instance = this.analyse(position[0], endPoint[0]);
            setTimeout(() => {
                this.$emit("end");
            }, 0);
        } else {
            this.initEvent();
        }
    };
    ViewShed.prototype.initEvent = function () {
        let cache = this.cache;
        let qtCanvas = viewer.canvasEl;
        let mousedown = this.mousedownEvent.bind(this);
        let mousemove = this.mousemoveEvent.bind(this);
        cache.mousedown = mousedown;
        cache.mousemove = mousemove;
        qtCanvas.style.cursor = "crosshair";
        let message = "左键拾取";
        this.initTooltip(message);
        qtCanvas.addEventListener("mousedown", mousedown);
        document.addEventListener("mousemove", mousemove);
    };
    ViewShed.prototype.mousedownEvent = function (e) {
        let cache = this.cache;
        if (e.button == 0) {
            cache.drawing = true;
            let posX = e.x;
            let posY = e.y;
            let scene = viewer.scene;
            let ray = scene.mainCamera.screenPointToRay(posX, posY);
            let hit = new Li.RaycastHit();
            if (scene.raycast(ray, hit)) {
                let point = hit.point;
                cache.points.push(point);
                if (cache.points.length == 1) {
                    this.tooltip.innerText = "左键分析";
                }
                if (cache.points.length == 2) {
                    this.removeMouseEvent();
                    return;
                }
            }
            hit.delete();
        }
    };
    ViewShed.prototype.mousemoveEvent = function (e) {
        let cache = this.cache;
        let posX = e.x;
        let posY = e.y;
        let tooltip = this.tooltip;
        tooltip.style.display = "block";
        tooltip.style.left = posX + 5 + "px";
        tooltip.style.top = posY + 5 + "px";
        if (cache.points.length == 0) {
            return;
        }
        let scene = viewer.scene;
        let ray = scene.mainCamera.screenPointToRay(posX, posY);
        let hit = new Li.RaycastHit();
        if (scene.raycast(ray, hit)) {
            let point = hit.point;
            if (cache.entity) {
                cache.entity.delete();
            }
            let entity = this.analyse(cache.points[0], point);
            cache.entity = entity;
            this.instance = entity;
        }
        hit.delete();
    };
    ViewShed.prototype.removeMouseEvent = function () {
        let cache = this.cache;
        let qtCanvas = viewer.canvasEl;
        if (cache.mousedown) {
            qtCanvas.removeEventListener("mousedown", cache.mousedown);
            cache.mousedown = null;
        }
        if (cache.mousemove) {
            document.removeEventListener("mousemove", cache.mousemove);
            cache.mousemove = null;
        }
        qtCanvas.style.cursor = "default";
        cache.drawing = false;
        this.removeTooltip();
        this.$emit("end");
    };
    ViewShed.prototype.end = function () {
        this.removeMouseEvent();
    };
    ViewShed.prototype.initTooltip = function (message) {
        let elem = document.createElement("div");
        elem.innerText = message;
        elem.style.cssText = `
            position: absolute;
            left: 0;
            top: 0;
            display: none;
            padding: 3px 6px;
            color: #fff;
            background-color: rgba(20, 20, 20, 0.6);
            font-size: 12px;
        `;
        document.body.appendChild(elem);
        this.tooltip = elem;
    };
    ViewShed.prototype.removeTooltip = function () {
        if (this.tooltip) {
            document.body.removeChild(this.tooltip);
            this.tooltip = null;
        }
    };
    ViewShed.prototype.analyse = function (position, endPoint) {
        let scene = viewer.scene;
        let viewshed = new Li.Viewshed();
        this.renderer = viewshed;
        let style = this._options.style;
        let color1 = color16ToRgb(style.visibleColor);
        let color2 = color16ToRgb(style.invisibleColor);
        if (style.offsetHeight) {
            position = vector3Offset(position, {
                offsetZ: style.offsetHeight,
            });
        }
        viewshed.start = position;
        viewshed.end = endPoint;
        viewshed.verticalAngle = style.verticalAngle;
        viewshed.horizontalAngle = style.horizontalAngle;
        viewshed.visibleColor = Li.Color.fromRgb(
            color1.r,
            color1.g,
            color1.b,
            255
        );
        viewshed.invisibleColor = Li.Color.fromRgb(
            color2.r,
            color2.g,
            color2.b,
            255
        );
        let subtract = Li.Vector3.subtract(endPoint, position);
        viewshed.radius = subtract.length();
        viewshed.showDebugFrame = this._options.showDebugFrame;
        let entity = new Li.Entity();
        entity.name = "viewshed";
        entity.addComponent(viewshed);
        scene.addEntity(entity);
        return entity;
    };
    /**
     * @description 移除
     */
    ViewShed.prototype.remove = function () {
        if (this.instance) {
            this.instance.delete();
            this.cache.viewshed = null;
            this.instance = null;
        }
    };
    Object.defineProperties(ViewShed.prototype, {
        /**
         * 投影距离
         * @memberof analyse.ViewShed.prototype
         * @type {Number}
         */
        radius: {
            get() {
                return this.renderer.radius;
            },
            set(val) {
                this.renderer.radius = val;
            },
        },
        /**
         * 水平张角
         * @memberof analyse.ViewShed.prototype
         * @type {Number}
         */
        horizontalAngle: {
            get() {
                return this.renderer.horizontalAngle;
            },
            set(val) {
                this.renderer.horizontalAngle = val;
            },
        },
        /**
         * 垂直张角
         * @memberof analyse.ViewShed.prototype
         * @type {Number}
         */
        verticalAngle: {
            get() {
                return this.renderer.verticalAngle;
            },
            set(val) {
                this.renderer.verticalAngle = val;
            },
        },
        /**
         * 开启调试线宽
         * @memberof analyse.ViewShed.prototype
         * @type {Number}
         */
        showDebugFrame: {
            get() {
                return this.renderer.showDebugFrame;
            },
            set(val) {
                this.renderer.showDebugFrame = val;
            },
        },
    });
    return ViewShed;
}

function global$h(Li, viewer) {
    /**
     * @description 开挖方量
     * @constructor
     * @alias analyse.CutFillVolume
     * @param {Object} options -参数
     * @param {Array} [options.positions=null] -范围点(最少3个点)
     *   |可选值                          | 描述               |
     *   |------------------------       |----------------    |
     *   |  [[longitude,latitude]]       |  经纬度坐标         |
     *   |   [{x:0,y:0,z:0}]             | 笛卡尔坐标          |
     *   |  [SSmap.Vector3.create(x,y,z)]   | 底层SDK向量对象
     * @param {String} [options.type=circle] -开挖范围几何类型
     *   |可选值       | 描述        |
     *   |--------     |--------    |
     *   |  circle     | 环形       |
     *   |  rect       | 矩形       |
     *   |  polygon    | 多边形     |
     * @param {Number} [options.baseHeight=35] -基准面高度（米）
     * @param {String} [options.color=#00ffff] -范围面的颜色
     * @param {String} [options.lineColor=#00ff00] -基准点线的颜色
     * @param {String} [options.fillColor=#00ffff] -填方体的颜色
     * @param {String} [options.cutColor=#00ffff] -开挖体的颜色
     * @param {Number} [options.alpha=0.35] -透明度
     *
     */
    function CutFillVolume(options) {
        let defaults = {
            type: "rect",
            style: {
                baseHeight: 35,
                color: "#00ffff",
                lineColor: "#00ff00",
                fillColor: "#00ffff",
                cutColor: "#00ff00",
                alpha: 0.35,
            },
        };
        this._options = mergeOptions(defaults, options);
        this.instance = null;
        initEvents(this);
        this.initData(this._options);
    }
    mixinEvents(CutFillVolume);
    CutFillVolume.prototype.initData = function (options) {
        if (options.positions) {
            let points = normalizeVec3Array(options.positions);
            this.analyse(points);
        } else {
            this.drawPolygon();
        }
    };
    CutFillVolume.prototype.drawPolygon = function () {
        let that = this;
        let polygon = new SSmap$1.graphic.Polygon({
            type: this._options.type,
            style: {
                mode: "OnTerrain",
                color: this._options.style.color,
                alpha: 0.3,
                fillAlpha: 0.3,
            },
        });
        polygon.$on("end", function () {
            polygon.remove();
            that.analyse(this.cache.points);
        });
        return polygon;
    };
    CutFillVolume.prototype.drawFillVolume = function (points, height) {
        let style = this._options.style;
        let volume = extrudeEntity({
            points,
            height: height,
            color: style.fillColor,
            onTerrian: true,
            opacity: style.alpha,
        });
        return volume;
    };
    CutFillVolume.prototype.analyse = function (points) {
        this._options.positions = points;
        setTimeout(() => {
            this.$emit("calc-start");
        }, 0);
        let style = this._options.style;
        let cutAndFillVolume = this.instance;
        if (!cutAndFillVolume) {
            let lineColor = color16ToRgb(style.lineColor);
            let fillColor = color16ToRgb(style.fillColor);
            let cutColor = color16ToRgb(style.cutColor);
            cutAndFillVolume = new Li.CutAndFillVolume();
            cutAndFillVolume.baseHeight = style.baseHeight;
            cutAndFillVolume.lineColor = Li.Color.fromRgb(
                lineColor.r,
                lineColor.g,
                lineColor.b,
                style.alpha * 255
            );
            cutAndFillVolume.fillVolumeColor = Li.Color.fromRgb(
                fillColor.r,
                fillColor.g,
                fillColor.b,
                style.alpha * 255
            );
            cutAndFillVolume.cutVolumeColor = Li.Color.fromRgb(
                cutColor.r,
                cutColor.g,
                cutColor.b,
                style.alpha * 255
            );

            for (let i = 0; i < points.length; i++) {
                cutAndFillVolume.addPoint(points[i]);
            }
            this.instance = cutAndFillVolume;
        }
        cutAndFillVolume.computeCutVolume();
        cutAndFillVolume.readyPromise.then(() => {
            let fillVolume = cutAndFillVolume.fillVolume();
            let cutVolume = cutAndFillVolume.cutVolume();
            let minHeight = cutAndFillVolume.minHeight();
            let maxHeight = cutAndFillVolume.maxHeight();
            let fillHeight = style.baseHeight - minHeight;
            let cutHeight = maxHeight - style.baseHeight;
            if (fillHeight > 0 && cutHeight > 0) {
                if (this._volume) {
                    this._volume.delete();
                }
                this._volume = this.drawFillVolume(points, style.baseHeight);
            }
            setTimeout(() => {
                this.$emit(
                    "calc-end",
                    cutVolume,
                    fillVolume,
                    minHeight,
                    maxHeight
                );
            }, 0);
        });
    };
    /**
     * @description 移除
     */
    CutFillVolume.prototype.remove = function () {
        if (this.instance) {
            this.instance.delete();
            this.instance = null;
        }
        if (this._volume) {
            this._volume.delete();
            this._volume = null;
        }
    };
    Object.defineProperties(CutFillVolume.prototype, {
        /**
         * 基准面高度
         * @memberof analyse.CutFillVolume.prototype
         * @type {Number}
         */
        baseHeight: {
            get() {
                let style = this._options.style;
                return style.baseHeight;
            },
            set(val) {
                let style = this._options.style;
                style.baseHeight = val;
                if (this.instance) {
                    this.instance.baseHeight = val;
                    this.analyse(this._options.positions);
                }
            },
        },
    });
    return CutFillVolume;
}

function global$g(Li, viewer) {
    /**
     * @description 压平分析
     * @constructor
     * @alias analyse.FlattenMask
     * @param {Object} options -参数
     * @param {Number} [options.mode=tileset] -压平类型
     *   |可选值       | 描述        |
     *   |--------      |--------   |
     *   |  tileset     | 3d-tiles  |
     *   |  globe       | 地形       |
     * @param {Object} [options.tileset] -压平类型为tileset时传入SSmap.Tileset生成的实例
     * @param {String} [options.type=rect] -压平范围几何类型
     *   |可选值       | 描述        |
     *   |--------     |--------    |
     *   |  circle     | 环形       |
     *   |  rect       | 矩形       |
     *   |  polygon    | 多边形     |
     * @param {Array} [options.positions=null] -范围点(最少3个点)
     *   |可选值                          | 描述               |
     *   |------------------------       |----------------    |
     *   |  [[longitude,latitude]]       |  经纬度坐标         |
     *   |   [{x:0,y:0,z:0}]             | 笛卡尔坐标          |
     *   |  [SSmap.Vector3.create(x,y,z)]   | 底层SDK向量对象     |
     * @param {Number} [options.height=0] -遮罩的高度，仅对globe地形遮罩有效
     */
    function FlattenMask(options) {
        let defaults = {
            type: "rect",
            mode: "tileset",
            tileset: null,
            positions: null,
            height: 0,
        };
        this._options = mergeOptions(defaults, options);
        /**
         * SSmap.FlattenMask实例对象.
         * @type {Object}
         */
        this.instance = null;
        initEvents(this);
        this.initData(this._options);
    }
    mixinEvents(FlattenMask);
    FlattenMask.prototype.initData = function (options) {
        let positions = options.positions;
        if (positions) {
            let points = normalizeVec3Array(positions);
            this.analyse(points);
        } else {
            this.drawPolygon();
        }
    };
    FlattenMask.prototype.drawPolygon = function () {
        let that = this;
        let polygon = new SSmap$1.graphic.Polygon({
            type: this._options.type,
            style: {
                mode: "OnTerrain",
                color: "#ff0000",
                alpha: 0.3,
                fillAlpha: 0.3,
            },
        });
        polygon.$on("end", function () {
            polygon.remove();
            that.analyse(this.cache.points);
        });
    };
    FlattenMask.prototype.analyse = function (points) {
        let mode = this._options.mode;
        let tileset = this._options.tileset;
        let height = this._options.height;
        if (mode == "globe") {
            tileset = viewer.scene.globe;
        }
        let mask = new Li.FlattenMask();
        mask.maskHeight = height;
        mask.setPoints(points);
        tileset.addFlattenMask(mask);
        this.instance = mask;
        this.$emit("end", this._options.mode);
        return mask;
    };
    /**
     * @description 移除
     */
    FlattenMask.prototype.remove = function () {
        if (this.instance) {
            let mode = this._options.mode;
            let tileset = this._options.tileset;
            if (mode == "globe") {
                tileset = viewer.scene.globe;
            }
            tileset.removeFlattenMask(this.instance);
            this.instance.delete();
            this.instance = null;
        }
    };
    Object.defineProperties(FlattenMask.prototype, {
        /**
         * 遮罩的高度，仅对globe地形遮罩有效
         * @memberof analyse.FlattenMask.prototype
         * @type {Number}
         */
        height: {
            get() {
                return this.instance.maskHeight;
            },
            set(val) {
                this.instance.maskHeight = val;
            },
        },
    });
    return FlattenMask;
}

function global$f(Li, viewer) {
    let instance = null;
    /**
     * @description 日照分析
     * @constructor
     * @alias analyse.Sunlight
     * @param {Object} options -参数
     * @param {Object} [options.style] -样式
     * @param {String} [options.style.speed=1600] -每秒日照变化时间(s)
     * @param {String} [options.style.castShow=true] -日照阴影
     */
    function Sunlight(options) {
        //单例模式
        if (instance && !options.toImage) {
            return instance;
        } else {
            let defaults = {
                maxTime: "",
                style: {
                    speed: 1600,
                    castShow: true,
                },
            };
            this._options = mergeOptions(defaults, options);
            initEvents(this);
            let date = new Date();
            let startDate = new Date(
                date.getFullYear(),
                date.getMonth(),
                date.getDate()
            );
            this.timer = null;
            this.startDate = startDate;
            this.currentTime = startDate.getTime();
            this.playing = false;
            this.create(this._options);
            instance = this;
        }
    }
    mixinEvents(Sunlight);
    Sunlight.prototype.create = function (options) {
        let style = options.style;
        let scene = viewer.scene;
        scene.sun.castShadow = style.castShow;
    };
    Sunlight.prototype.play = function () {
        let style = this._options.style;
        this.playing = true;
        if (!this.timer) {
            this.currentTime = this.startDate.getTime();
            let scene = viewer.scene;
            let frameAction = new Li.FrameAction();
            frameAction.onTriggered((delta) => {
                if (!this.playing) {
                    return;
                }
                let endTime = this.startDate.getTime() + 24 * 60 * 60 * 1000;
                let offsetTime = delta * style.speed * 1000;
                let currentTime = this.currentTime + offsetTime;
                if (currentTime > endTime) {
                    this.playing = false;
                    this.timer.delete();
                    this.timer = null;
                    return;
                }
                let date = new Date(currentTime);
                this.$emit("animating", date);
                this.setTime(date);
            });
            scene.rootEntity.addComponent(frameAction);
            this.timer = frameAction;
        }
    };
    Sunlight.prototype.setTime = function (date) {
        this.startDate = new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate()
        );
        this.currentTime = date.getTime();
        let timeSystem = viewer.timeSystem;
        timeSystem.setYear(date.getFullYear());
        timeSystem.setMonth(date.getMonth() + 1);
        timeSystem.setDay(date.getDate());
        timeSystem.setHour(date.getHours());
        timeSystem.setMinute(date.getMinutes());
    };
    /**
     * @description 移除
     */
    Sunlight.prototype.remove = function () {
        if (this.instance) {
            this.instance.delete();
            this.instance = null;
        }
    };
    return Sunlight;
}

function global$e(Li, viewer) {
    const Vertical = {
        center: "CENTER_V",
        bottom: "BOTTOM",
        baseLine: "BASELINE",
        top: "TOP",
    };
    const Horizontal = {
        center: "CENTER_H",
        left: "LEFT",
        right: "RIGHT",
    };
    let collection = null;
    let pickEvent = null;
    /**
     * @description Billboard 图标点
     * @constructor
     * @alias graphic.Billboard
     * @param {Object} options -参数
     * @param {String} options.url -图片链接
     * @param {Object} [options.position=null] -点位置
     *   |可选值                                 | 描述               |
     *   |------------------------------------  |----------------    |
     *   |  [[longitude,latitude,height]]       |  经纬度坐标         |
     *   |   [{x:0,y:0,z:0}]                    | 笛卡尔坐标          |
     *   |  [SSmap.Vector3.create(x,y,z)]       | 底层SDK向量对象     |
     * @param {Object} [options.data] -json数据 例：{ name: "深圳会展中心", id: 128939 }
     * @param {Object} options.style -样式
     * @param {String} [options.style.mode=OnTerrain] -定位模式
     *   |可选值       | 描述           |
     *   |--------     |--------       |
     *   |  OnTerrain  | 贴地模式       |
     *   |  Absolute   | 绝对模式       |
     * @param {Number} [options.style.attitude=null] -绝对模式下海拔高度
     * @param {Number} [options.style.width] -图标宽度（默认为加载图标尺寸）
     * @param {Number} [options.style.height] -图标高度（默认为加载图标尺寸）
     * @param {Number} [options.style.rotation=0] -旋转角度
     * @param {Number} [options.style.scale=1] -缩放比例
     * @param {String} [options.style.align=center] -水平位置
     *   |可选值       | 描述           |
     *   |--------     |--------       |
     *   |  left       | 向左对齐       |
     *   |  center     | 居中对齐       |
     *   |  right      | 向右对齐       |
     * @param {String} [options.style.verticalAlign=bottom] -垂直位置
     *   |可选值       | 描述           |
     *   |--------     |--------       |
     *   |  top        | 顶部对齐       |
     *   |  center     | 居中对齐       |
     *   |  bottom     | 底部对齐       |
     */
    function Billboard(options) {
        let defaults = {
            url: "",
            position: null,
            style: {
                mode: "OnTerrain",
                width: null,
                height: null,
                attitude: null,
                rotation: 0,
                scale: 1,
                align: "center",
                verticalAlign: "bottom",
            },
        };
        this.instance = null;
        this._options = mergeOptions(defaults, options);
        initEvents(this);
        if (this._options.position) {
            let position = normalizeVec3Array([this._options.position]);
            this.render(position[0]);
        } else {
            this.init(this._options);
        }
    }
    mixinEvents(Billboard);
    Billboard.prototype.init = function () {
        pickClickPoint((point) => {
            this.render(point);
        });
    };
    Billboard.prototype.addProperty = function (key, value) {
        if (this.instance) {
            this.instance.addProperty(key, value);
        }
    };
    Billboard.prototype.addProperties = function (data) {
        if (this.instance) {
            for (const key in data) {
                if (Object.hasOwnProperty.call(data, key)) {
                    this.addProperty(key, data[key]);
                }
            }
        }
    };
    Billboard.prototype.render = function (position) {
        let that = this;
        let style = this._options.style;
        let data = this._options.data;
        let img = new Image();
        img.src = this._options.url;
        img.onload = function () {
            let bbEntity = new Li.BillboardEntity();
            that.instance = bbEntity;
            bbEntity.url = that._options.url;
            bbEntity.position = position;
            bbEntity.imageWidth = style.width || img.width;
            bbEntity.imageHeight = style.height || img.height;
            bbEntity.rotation = style.rotation * (Math.PI / 180);
            bbEntity.scale = style.scale;
            bbEntity.vertical = Li.Vertical[Vertical[style.verticalAlign]];
            bbEntity.horizontal = Li.Horizontal[Horizontal[style.align]];
            bbEntity.altitudeMethod = Li.AltitudeMethod[style.mode];
            if (style.attitude) {
                bbEntity.altitude = style.attitude;
            }
            if (data) {
                that.addProperties(data);
            }
            collection = collection
                ? collection
                : Li.BillboardCollection.Instance();
            bbEntity.setCollection(collection);
            that.$emit("end");
        };
    };
    /**
     * @description 移除
     */
    Billboard.prototype.remove = function () {
        if (this.instance) {
            this.instance.delete();
            this.instance = null;
        }
    };
    /**
     * @description 移除所有
     *
     */
    Billboard.removeAll = function () {
        if (collection) {
            collection.removeAll();
            collection = null;
        }
    };
    /**
     * @description 鼠标拾取点回调
     * @param {Function} cb -返回拾取点数据cb(data)
     */
    Billboard.pick = function (cb) {
        if (!pickEvent) {
            let canvas = viewer.canvasEl;
            pickEvent = function () {
                let feature = viewer.scene.getFeatureByMouse();
                let bbEntity = Li.BillboardEntity.getSelect(feature);
                if (bbEntity) {
                    if (feature == null || feature == undefined) return;
                    let nameList = feature.propertyNames();
                    let size = nameList.size();
                    let data = {};
                    for (let i = 0; i < size; i++) {
                        let key = nameList.get(i);
                        let value = feature.getProperty(key);
                        data[key] = value;
                    }
                    cb(data);
                }
            };
            canvas.addEventListener("click", pickEvent);
        }
    };
    return Billboard;
}

function global$d(Li, viewer) {
    /**
     * @description 3D线物体
     * @constructor
     * @alias graphic.Polyline
     * @param {Object} options -参数
     * @param {Array} [options.positions=null] -点数组(最少2个点)
     *   |可选值                                 | 描述               |
     *   |------------------------------------  |----------------    |
     *   |  [[longitude,latitude,height]]       |  经纬度坐标         |
     *   |   [{x:0,y:0,z:0}]                    | 笛卡尔坐标          |
     *   |  [SSmap.Vector3.create(x,y,z)]       | 底层SDK向量对象     |
     * @param {Boolean} [options.closePath=false] -起始点和结束点连接
     * @param {Object | Array} [options.shapes=null] -SSmap.graphic.Shape对象或数组
     * @param {Object} [options.origin=null] -绘制shape时原始点
     *   |可选值                                 | 描述               |
     *   |------------------------------------  |----------------    |
     *   |  [longitude,latitude,height]       |  经纬度坐标         |
     *   |   {x:0,y:0,z:0}                    | 笛卡尔坐标          |
     *   |  SSmap.Vector3.create(x,y,z)       | 底层SDK向量对象     |
     * @param {Object} [options.style] -样式
     * @param {String} [options.style.mode=Absolute] -定位模式
     *   |可选值       | 描述           |
     *   |--------     |--------       |
     *   |  OnTerrain  | 贴地模式       |
     *   |  Absolute   | 绝对模式       |
     * @param {Number} [options.style.attitude=null] -绝对模式下海拔高度
     * @param {String} [options.style.color=#ff0000] -线的颜色
     * @param {Number} [options.style.alpha=0.9] -透明度
     * @param {Number} [options.style.width=2] -线宽
     * @param {Number} [options.style.offsetX=0] -绘制shape时x偏移
     * @param {Number} [options.style.offsetY=0] -绘制shape时y偏移
     * @param {Number} [options.style.segment=12] -绘制shape时曲线分割片段
     * @param {Number} [options.style.scale=1] -绘制shape时缩放比例
     * @param {Boolean} [options.style.dash=false] -虚线
     * @param {Boolean} [options.style.depthTest=true] -线的深度测试
     * @param {Boolean} [options.style.glow=false] -发光线
     * @param {Object} [options.style.animation=null] -动画
     * @param {String} [options.style.animation.type=HorizontalFlow] -动画类型
     *   |可选值             | 描述           |
     *   |--------          |--------       |
     *   |  HorizontalFlow  | 水平流动       |
     *   |  Flash           | 快速闪烁       |
     *   |  Twinkle         | 渐变闪烁       |
     * @param {String} options.style.animation.imgUrl -线纹理
     * @param {Number} [options.style.animation.duration=2000] -动画周期时间(ms)
     * @param {Number} options.style.animation.repeat -纹理动画的重复数量
     */
    function Polyline(options) {
        let defaults = {
            positions: null,
            shapes: null,
            origin: null,
            closePath: false,
            style: {
                mode: "Absolute",
                attitude: null,
                color: "#FF0000",
                alpha: 1,
                width: 2,
                offsetX: 0,
                offsetY: 0,
                scale: 1,
                segment: 12,
                dash: false,
                depthTest: true,
                glow: false,
                animation: null,
            },
        };
        this._options = mergeOptions(defaults, options);
        this.cache = {
            points: [],
            list: [],
        };
        initEvents(this);
        this.init(this._options);
    }
    mixinEvents(Polyline);
    Polyline.prototype.init = function (options) {
        let cache = this.cache;
        let positions = options.positions;
        let style = options.style;
        if (positions) {
            let polyline = this.createPolyline3d(style);
            cache.polyline = polyline;
            this.render(polyline, positions);
            this.instance = polyline;
        } else if (options.shape) {
            this.shapeToPolyine(options);
        } else {
            let polyline = this.createPolyline3d(style);
            cache.polyline = polyline;
            let qtCanvas = viewer.canvasEl;
            let mousedown = this.mousedownEvent.bind(this);
            let mousemove = this.mousemoveEvent.bind(this);
            cache.mousedown = mousedown;
            cache.mousemove = mousemove;
            qtCanvas.style.cursor = "crosshair";
            let message = "左键拾取，右键结束";
            this.initTooltip(message);
            qtCanvas.addEventListener("mousedown", mousedown);
            document.addEventListener("mousemove", mousemove);
        }
    };
    Polyline.prototype.mousedownEvent = function (e) {
        let cache = this.cache;
        if (e.button == 0) {
            cache.drawing = true;
            let posX = e.x;
            let posY = e.y;
            let scene = viewer.scene;
            let ray = scene.mainCamera.screenPointToRay(posX, posY);
            let hit = new Li.RaycastHit();
            if (scene.raycast(ray, hit)) {
                let point = hit.point;
                cache.polyline.addPoint(point);
                cache.points.push(point);
                this.$emit("step", e, point);
            }
            hit.delete();
        }
        if (e.button == 2 && cache.drawing) {
            this.rightMouseEvent();
        }
    };
    Polyline.prototype.mousemoveEvent = function (e) {
        let cache = this.cache;
        let posX = e.x;
        let posY = e.y;
        let tooltip = this.tooltip;
        tooltip.style.display = "block";
        tooltip.style.left = posX + 5 + "px";
        tooltip.style.top = posY + 5 + "px";
        if (cache.points.length == 0) {
            return;
        }
        let scene = viewer.scene;
        let ray = scene.mainCamera.screenPointToRay(posX, posY);
        let hit = new Li.RaycastHit();
        if (scene.raycast(ray, hit)) {
            let point = hit.point;
            cache.polyline.lineTo(point);
        }
        hit.delete();
    };
    Polyline.prototype.rightMouseEvent = function () {
        let cache = this.cache;
        let point = cache.points[cache.points.length - 1];
        cache.polyline.addPoint(point);
        if (this._options.closePath) {
            cache.polyline.addPoint(cache.points[0]);
        }
        cache.polyline.draw();
        cache.polyline.end();
        this.removeMouseEvent();
    };
    Polyline.prototype.removeMouseEvent = function () {
        let cache = this.cache;
        let qtCanvas = viewer.canvasEl;
        if (cache.mousedown) {
            qtCanvas.removeEventListener("mousedown", cache.mousedown);
            cache.mousedown = null;
        }
        if (cache.mousemove) {
            document.removeEventListener("mousemove", cache.mousemove);
            cache.mousemove = null;
        }
        qtCanvas.style.cursor = "default";
        cache.drawing = false;
        this.removeTooltip();
        this.$emit("end");
    };
    Polyline.prototype.end = function () {
        this.removeMouseEvent();
    };
    Polyline.prototype.initTooltip = function (message) {
        let elem = document.createElement("div");
        elem.innerText = message;
        elem.style.cssText = `
            position: absolute;
            left: 0;
            top: 0;
            display: none;
            padding: 3px 6px;
            color: #fff;
            background-color: rgba(20, 20, 20, 0.6);
            font-size: 12px;
        `;
        document.body.appendChild(elem);
        this.tooltip = elem;
    };
    Polyline.prototype.removeTooltip = function () {
        if (this.tooltip) {
            document.body.removeChild(this.tooltip);
            this.tooltip = null;
        }
    };
    Polyline.prototype.createPolyline3d = function ({
        mode,
        attitude,
        width,
        color,
        alpha,
        dash,
        animation,
        depthTest,
        glow,
    }) {
        let polyline = new Li.Polyline3D();
        color = color16ToRgb(color);
        polyline.setWidth(width);
        polyline.color = Li.Color.fromRgb(color.r, color.g, color.b, 255);
        polyline.alpha = alpha;
        polyline.dash = dash;
        polyline.animation = animation;
        polyline.setGlowMaterial(glow);
        if (animation) {
            let type = animation.type || "HorizontalFlow";
            if (animation.imgUrl) {
                polyline.setImageUrl(animation.imgUrl);
            }
            if (animation.repeat) {
                polyline.setRepeat(animation.repeat);
            }
            polyline.animationRun = true;
            polyline.animationType = Li.AnimationType[type];
            polyline.animationTimer = animation.duration || 2000;
        }
        polyline.depthTest = depthTest;
        polyline.setAltitudeMethod(Li.AltitudeMethod[mode]);
        if (mode == "Absolute") {
            polyline.attitude = attitude;
        }
        return polyline;
    };
    Polyline.prototype.shapeToPolyine = function (options) {
        let cache = this.cache;
        let positions = options.positions;
        let shapes = options.shape;
        let origin = options.origin;
        let style = options.style;
        if (origin) {
            shapes = Array.isArray(shapes) ? shapes : [shapes];
            shapes.forEach((shape, index) => {
                let polyline = this.createPolyline3d(style);
                if (index == 0) {
                    cache.polyline = polyline;
                } else {
                    cache.list.push(polyline);
                }
                let { shape: points, holes } = shape.extractPoints(
                    style.segment
                );
                origin = normalizeVec3Array([origin])[0];
                //shape
                let rotation = Li.Quaternion.fromEulerAngles(180, 0, 0);
                positions = points.map((vec2) => {
                    let point = vector3Offset(
                        origin,
                        {
                            offsetX: vec2.x + style.offsetX,
                            offsetY: vec2.y + style.offsetY,
                        },
                        rotation,
                        style.scale
                    );
                    return point;
                });
                this.render(polyline, positions);
                this.instance = polyline;
                //holes
                holes.forEach((points) => {
                    let polyline = this.createPolyline3d(style);
                    positions = points.map((vec2) => {
                        let point = vector3Offset(
                            origin,
                            {
                                offsetX: vec2.x + style.offsetX,
                                offsetY: vec2.y + style.offsetY,
                            },
                            rotation,
                            style.scale
                        );
                        return point;
                    });
                    this.render(polyline, positions);
                    cache.list.push(polyline);
                });
            });
        } else {
            throw new Error("空间坐标参数origin为空！");
        }
    };
    Polyline.prototype.render = function (polyline, positions) {
        let cache = this.cache;
        positions.forEach((position) => {
            let point = null;
            if (position instanceof Li.Vector3) {
                point = position;
            } else if (Array.isArray(position)) {
                let cart = Li.Cartographic.fromDegrees(
                    position[0],
                    position[1],
                    position[2] || 0
                );
                point = cart.toVector3();
            } else {
                point = Li.Vector3.create(position.x, position.y, position.z);
            }
            polyline.addPoint(point);
            cache.points.push(point);
        });
        if (this._options.closePath) {
            polyline.addPoint(positions[0]);
        }
        polyline.addProperty("name", "polyine");
        polyline.draw();
        polyline.end();
    };
    /**
     * @description 移除
     */
    Polyline.prototype.remove = function () {
        let cache = this.cache;
        if (cache.polyline) {
            cache.polyline.delete();
            cache.list.forEach((item) => {
                item.delete();
            });
            cache = {
                points: [],
                list: [],
            };
        }
    };
    return Polyline;
}

function global$c(Li, viewer) {
    /**
     * @description 3D多边形物体
     * @constructor
     * @alias graphic.Polygon
     * @param {Object} options -参数
     * @param {String} [options.type=polygon] -绘制几何类型
     *   |可选值       | 描述        |
     *   |--------     |--------    |
     *   |  circle     | 环形       |
     *   |  rect       | 矩形       |
     *   |  polygon    | 多边形     |
     * @param {Array} [options.positions=null] -点数组(最少2个点)
     *   |可选值                                 | 描述               |
     *   |------------------------------------  |----------------    |
     *   |  [[longitude,latitude,height]]       |  经纬度坐标         |
     *   |   [{x:0,y:0,z:0}]                    | 笛卡尔坐标          |
     *   |  [SSmap.Vector3.create(x,y,z)]       | 底层SDK向量对象     |
     * @param {Object | Array} [options.shapes=null] -SSmap.graphic.Shape对象或数组
     * @param {Object} [options.origin=null] -绘制shape时原始点
     *   |可选值                                 | 描述               |
     *   |------------------------------------  |----------------    |
     *   |  [longitude,latitude,height]       |  经纬度坐标         |
     *   |   {x:0,y:0,z:0}                    | 笛卡尔坐标          |
     *   |  SSmap.Vector3.create(x,y,z)       | 底层SDK向量对象     |
     * @param {Object} [options.style] -样式
     * @param {String} [options.style.mode=Absolute] -定位模式
     *   |可选值       | 描述           |
     *   |--------     |--------       |
     *   |  OnTerrain  | 贴地模式       |
     *   |  Absolute   | 绝对模式       |
     * @param {Number} [options.style.attitude] -绝对模式下海拔高度
     * @param {String} [options.style.color=#00ff00] -填充颜色
     * @param {Number} [options.style.fillAlpha=0.99] -填充透明度
     * @param {String} [options.style.imgUrl] -填充背景图片
     * @param {Number} [options.style.repeat] -背景图片重复次数
     * @param {Boolean} [options.style.waterShader=false] -水材质
     * @param {Number} [options.style.alpha=0.99] -透明度
     * @param {Number} [options.style.offsetX=0] -绘制shape时x偏移
     * @param {Number} [options.style.offsetY=0] -绘制shape时y偏移
     * @param {Number} [options.style.segment=12] -绘制shape时曲线分割片段
     * @param {Number} [options.style.scale=1] -绘制shape时缩放比例
     * @param {Number} [options.style.alpha=0.99] -描边透明度
     * @param {Number} [options.style.borderWidth=1] -描边宽度
     * @param {Boolean} [options.style.dash=false] -描边虚线
     * @param {Boolean} [options.style.depthTestDistance=100000] -设置多边形深度检测的有效距离
     */
    function Polygon(options) {
        let defaults = {
            type: "polygon",
            positions: null,
            origin: null,
            shapes: null,
            style: {
                mode: "Absolute",
                attitude: null,
                borderColor: "",
                color: "#00FF00",
                imgUrl: "",
                alpha: 0.99,
                fillAlpha: 0.99,
                waterShader: false,
                offsetX: 0,
                offsetY: 0,
                scale: 1,
                segment: 12,
                repeat: 0,
            },
        };
        this._options = mergeOptions(defaults, options);
        this.cache = {
            points: [],
            list: [],
        };
        initEvents(this);
        this.init(this._options);
    }
    mixinEvents(Polygon);
    Polygon.prototype.init = function (options) {
        let cache = this.cache;
        let positions = options.positions;
        if (positions) {
            let polygon = this.render(positions, "end");
            cache.polygon = polygon;
        } else if (options.shape) {
            this.shapeToPolygon(options);
        } else {
            let qtCanvas = viewer.canvasEl;
            let mousedown = this.mousedownEvent.bind(this);
            let mousemove = this.mousemoveEvent.bind(this);
            cache.mousedown = mousedown;
            cache.mousemove = mousemove;
            qtCanvas.style.cursor = "crosshair";
            let message = "左键拾取";
            if (options.type == "polygon") {
                message += "，右键结束";
            }
            this.initTooltip(message);
            qtCanvas.addEventListener("mousedown", mousedown);
            document.addEventListener("mousemove", mousemove);
        }
    };
    Polygon.prototype.mousedownEvent = function (e) {
        let cache = this.cache;
        if (e.button == 0) {
            cache.drawing = true;
            let posX = e.x;
            let posY = e.y;
            let scene = viewer.scene;
            let ray = scene.mainCamera.screenPointToRay(posX, posY);
            let hit = new Li.RaycastHit();
            if (scene.raycast(ray, hit)) {
                let point = hit.point;
                cache.points.push(point);
                this.$emit("step", e, point);
                if (
                    cache.points.length == 2 &&
                    this._options.type != "polygon"
                ) {
                    this.rightMouseEvent();
                    return;
                }
            }
            hit.delete();
        }
        if (e.button == 2 && cache.drawing) {
            this.rightMouseEvent();
        }
    };
    Polygon.prototype.mousemoveEvent = function (e) {
        let cache = this.cache;
        let posX = e.x;
        let posY = e.y;
        let tooltip = this.tooltip;
        tooltip.style.display = "block";
        tooltip.style.left = posX + 5 + "px";
        tooltip.style.top = posY + 5 + "px";
        if (cache.points.length == 0) {
            return;
        }
        let scene = viewer.scene;
        let ray = scene.mainCamera.screenPointToRay(posX, posY);
        let hit = new Li.RaycastHit();
        if (scene.raycast(ray, hit)) {
            let point = hit.point;
            if (cache.polygon) {
                cache.polygon.delete();
            }
            let polygon = this.render([...cache.points, point]);
            cache.polygon = polygon;
        }
        hit.delete();
    };
    Polygon.prototype.rightMouseEvent = function () {
        let cache = this.cache;
        if (cache.polygon) {
            cache.polygon.delete();
        }
        let polygon = this.render(cache.points, "end");
        cache.polygon = polygon;
        this.removeMouseEvent();
    };
    Polygon.prototype.removeMouseEvent = function () {
        let cache = this.cache;
        let qtCanvas = viewer.canvasEl;
        if (cache.mousedown) {
            qtCanvas.removeEventListener("mousedown", cache.mousedown);
            cache.mousedown = null;
        }
        if (cache.mousemove) {
            document.removeEventListener("mousemove", cache.mousemove);
            cache.mousemove = null;
        }
        qtCanvas.style.cursor = "default";
        cache.drawing = false;
        this.removeTooltip();
        this.$emit("end");
    };
    Polygon.prototype.end = function () {
        this.removeMouseEvent();
    };
    Polygon.prototype.initTooltip = function (message) {
        let elem = document.createElement("div");
        elem.innerText = message;
        elem.style.cssText = `
            position: absolute;
            left: 0;
            top: 0;
            display: none;
            padding: 3px 6px;
            color: #fff;
            background-color: rgba(20, 20, 20, 0.6);
            font-size: 12px;
        `;
        document.body.appendChild(elem);
        this.tooltip = elem;
    };
    Polygon.prototype.removeTooltip = function () {
        if (this.tooltip) {
            document.body.removeChild(this.tooltip);
            this.tooltip = null;
        }
    };
    Polygon.prototype.createPolygon3d = function ({
        borderWidth,
        borderColor,
        color,
        alpha,
        fillAlpha,
        imgUrl,
        mode,
        waterShader,
        altitude,
        bottomHeight,
        limitHeight,
        repeat,
    }) {
        color = color16ToRgb(color);
        borderColor = borderColor ? color16ToRgb(borderColor) : color;
        let polygon3d = new Li.Polygon3D();
        polygon3d.color = Li.Color.fromRgb(
            borderColor.r,
            borderColor.g,
            borderColor.b,
            255
        );
        if (borderWidth) {
            polygon3d.setWidth(borderWidth);
        }
        polygon3d.alpha = alpha;
        polygon3d.setFillColor(
            Li.Color.fromRgb(color.r, color.g, color.b, 255)
        );
        polygon3d.fillAlpha = fillAlpha;
        polygon3d.waterShader = waterShader;
        if (imgUrl) {
            polygon3d.fillMode = Li.FillMode.FillImage;
            polygon3d.image = imgUrl;
            polygon3d.alpha = 0;
            polygon3d.setRepeat(repeat);
        }
        if (altitude) {
            polygon3d.setAltitude(altitude);
        }
        if (bottomHeight) {
            polygon3d.setHeight(bottomHeight);
        }
        if (limitHeight) {
            polygon3d.setLimitHeight(limitHeight);
        }
        polygon3d.setAltitudeMethod(Li.AltitudeMethod[mode]);
        return polygon3d;
    };
    Polygon.prototype.shapeToPolygon = function (options) {
        let cache = this.cache;
        let positions = options.positions;
        let shapes = options.shape;
        let origin = options.origin;
        let style = options.style;
        if (origin) {
            shapes = Array.isArray(shapes) ? shapes : [shapes];
            shapes.forEach((shape, index) => {
                let { shape: points, holes } = shape.extractPoints(
                    style.segment
                );
                origin = normalizeVec3Array([origin])[0];
                //shape
                let rotation = Li.Quaternion.fromEulerAngles(180, 0, 0);
                positions = points.map((vec2) => {
                    let point = vector3Offset(
                        origin,
                        {
                            offsetX: vec2.x + style.offsetX,
                            offsetY: vec2.y + style.offsetY,
                        },
                        rotation,
                        style.scale
                    );
                    return point;
                });
                let polygon = this.render(positions, "end");
                if (index == 0) {
                    cache.polygon = polygon;
                    this.instance = polygon;
                } else {
                    cache.list.push(polygon);
                }
                //holes
                holes.forEach((points) => {
                    positions = points.map((vec2) => {
                        let point = vector3Offset(
                            origin,
                            {
                                offsetX: vec2.x + style.offsetX,
                                offsetY: vec2.y + style.offsetY,
                            },
                            rotation,
                            style.scale
                        );
                        return point;
                    });
                    let polygon = this.render(positions, "end");
                    cache.list.push(polygon);
                });
            });
        } else {
            throw new Error("空间坐标参数origin为空！");
        }
    };
    Polygon.prototype.render = function (positions, mode) {
        let cache = this.cache;
        let type = this._options.type;
        let polygon = this.createPolygon3d(this._options.style);
        if (type != "polygon" && positions.length == 2) {
            let pointA = positions[0];
            let pointB = positions[1];
            let points = [];
            if (type == "rect") {
                let cartoA = pointA.toCartographic();
                let cartoB = pointB.toCartographic();
                let midHeight = (cartoA.height + cartoB.height) / 2;
                let rectangle = Li.Rectangle.create(0, 0, 0, 0);
                rectangle.combinePoint(cartoA);
                rectangle.combinePoint(cartoB);
                let sw = rectangle.southwest();
                sw.height = midHeight;
                let nw = rectangle.northwest();
                nw.height = midHeight;
                let ne = rectangle.northeast();
                ne.height = midHeight;
                let se = rectangle.southeast();
                se.height = midHeight;

                points.push(
                    sw.toVector3(),
                    nw.toVector3(),
                    ne.toVector3(),
                    se.toVector3()
                );
                rectangle.delete();
            } else if (type == "circle") {
                let radius = Li.Vector3.subtract(pointA, pointB);
                radius = radius.length();
                // 中心点
                for (let i = 0; i <= 360; i += 1) {
                    if (i % 3 == 0) {
                        let x = radius * Math.cos((i * Math.PI) / 180);
                        let y = radius * Math.sin((i * Math.PI) / 180);
                        let circle = vector3Offset(pointA, {
                            offsetX: x,
                            offsetY: y,
                        });
                        points.push(circle);
                    }
                }
            }
            positions = points;
        }
        positions.forEach((position) => {
            let point = null;
            if (position instanceof Li.Vector3) {
                point = position;
            } else if (Array.isArray(position)) {
                let cart = Li.Cartographic.fromDegrees(
                    position[0],
                    position[1],
                    position[2] || 0
                );
                point = cart.toVector3();
            } else {
                point = Li.Vector3.create(position.x, position.y, position.z);
            }
            polygon.addPoint(point);
        });
        polygon.addProperty("name", "polygon");
        polygon.draw();
        polygon.end();
        this.instance = polygon;
        if (mode == "end") {
            cache.points = positions;
        }
        return polygon;
    };
    /**
     * @description 移除
     */
    Polygon.prototype.remove = function () {
        let cache = this.cache;
        if (cache.polygon) {
            cache.polygon.delete();
            cache.list.forEach((item) => {
                item.delete();
            });
            cache = {
                points: [],
                list: [],
            };
            this.instance = null;
        }
    };
    Object.defineProperties(Polygon.prototype, {
        /**
         * polygon的海拔高度
         * @memberof graphic.Polygon.prototype
         * @type {Number}
         */
        altitude: {
            get() {
                return this.instance.altitude();
            },
            set(val) {
                if (this.instance) {
                    this.instance.setAltitude(val);
                }
            },
        },
        /**
         * polygon的宽度
         * @memberof graphic.Polygon.prototype
         * @type {Number}
         */
        width: {
            get() {
                return this.instance.width();
            },
            set(val) {
                if (this.instance) {
                    this.instance.setWidth(val);
                }
            },
        },
        /**
         * 设置polygon的填充颜色
         * @memberof graphic.Polygon.prototype
         * @type {Number}
         */
        fillColor: {
            set(val) {
                if (this.instance) {
                    let color = color16ToRgb(val);
                    this.instance.setFillColor(color);
                }
            },
        },
    });
    return Polygon;
}

/**
 * @description 3D拉伸体对象
 * @constructor
 * @alias graphic.ExtrudeEntity
 * @param {Object} options -参数
 * @param {String} [options.type=entity] -绘制类型
 *   |可选值           | 描述        |
 *   |--------        |--------     |
 *   |  entity        | 实体         |
 *   |  outline       | 轮廓线       |
 * @param {Array} [options.positions=null] -点数组(最少2个点)
 *   |可选值                                 | 描述               |
 *   |------------------------------------  |----------------    |
 *   |  [[longitude,latitude,height]]       |  经纬度坐标         |
 *   |   [{x:0,y:0,z:0}]                    | 笛卡尔坐标          |
 *   |  [SSmap.Vector3.create(x,y,z)]       | 底层SDK向量对象     |
 * @param {Object} [options.shape=null] -SSmap.graphic.Shape对象
 * @param {Object} [options.origin=null] -绘制shape时原始点
 *   |可选值                                 | 描述               |
 *   |------------------------------------  |----------------    |
 *   |  [longitude,latitude,height]       |  经纬度坐标         |
 *   |   {x:0,y:0,z:0}                    | 笛卡尔坐标          |
 *   |  SSmap.Vector3.create(x,y,z)       | 底层SDK向量对象     |
 * @param {Object} [options.style] -样式
 * @param {Number} [options.style.baseHeight] -拉伸面基准高度
 * @param {Number} [options.style.height] -拉伸高度
 * @param {String} [options.style.color=#00ff00] -填充颜色
 * @param {Number} [options.style.opacity=0.99] -填充透明度
 * @param {String} [options.style.wallMap] -设置围墙贴图
 * @param {String} [options.style.roofMap] -设置顶部贴图
 * @param {Boolean} [options.style.waterShader=false] -水材质
 * @param {Number} [options.style.offsetX=0] -绘制shape时x偏移
 * @param {Number} [options.style.offsetY=0] -绘制shape时y偏移
 * @param {Number} [options.style.segment=12] -绘制shape时曲线分割片段
 * @param {Number} [options.style.scale=1] -绘制shape时缩放比例
 * @param {String} [options.style.imgUrl] -type=outline时填充背景图片
 * @param {Number} [options.style.linewidth=2] -type=outline时轮廓线宽度
 * @param {String} [options.style.lineColor=#00ffff] -type=outline时轮廓线颜色
 * @param {Object} [options.style.animation=null] -type=outline时动画
 * @param {String} [options.style.animation.type=HorizontalFlow] -动画类型
 *   |可选值             | 描述           |
 *   |--------          |--------       |
 *   |  HorizontalFlow  | 水平流动       |
 *   |  Flash           | 快速闪烁       |
 *   |  Twinkle         | 渐变闪烁       |
 * @param {String} [options.style.animation.cw=false] -动画是正转/反转，true:顺时针，false:逆时针
 * @param {Number} [options.style.animation.duration=2000] -动画周期时间(ms)
 *
 */
function global$b(Li, viewer) {
    function ExtrudeEntity(options) {
        let defaults = {
            type: "entity",
            positions: null,
            shape: null,
            style: {
                imgUrl: "",
                roofMap: "",
                wallMap: "",
                color: "#00ffff",
                lineColor: "#00ffff",
                linewidth: 2.0,
                opacity: 0.99,
                offsetX: 0,
                offsetY: 0,
                scale: 1,
                castShadow: false,
                waterShader: false,
                baseHeight: 0,
                gradient: true,
                animation: null,
                objectName: "",
                tag: "",
            },
        };
        this._options = mergeOptions(defaults, options);
        this.cache = {
            points: [],
            list: [],
        };
        this.instance = null;
        initEvents(this);
        this.initData(this._options);
    }
    mixinEvents(ExtrudeEntity);
    ExtrudeEntity.prototype.initData = function (options) {
        let cache = this.cache;
        let positions = options.positions;
        if (positions) {
            let points = normalizeVec3Array(positions);
            let entity =
                options.type == "outline"
                    ? this.drawBuildingOutline(points, this._options.style)
                    : this.extrudeEntity(points, this._options.style);
            this.instance = entity;
        } else if (options.shape) {
            this.shapeToPolygon(options);
        } else {
            let qtCanvas = viewer.canvasEl;
            let mousedown = this.mousedownEvent.bind(this);
            let mousemove = this.mousemoveEvent.bind(this);
            cache.mousedown = mousedown;
            cache.mousemove = mousemove;
            qtCanvas.style.cursor = "crosshair";
            let message = "左键拾取，右键结束";
            this.initTooltip(message);
            qtCanvas.addEventListener("mousedown", mousedown);
            document.addEventListener("mousemove", mousemove);
        }
    };
    ExtrudeEntity.prototype.mousedownEvent = function (e) {
        let cache = this.cache;
        if (e.button == 0) {
            cache.drawing = true;
            let posX = e.x;
            let posY = e.y;
            let scene = viewer.scene;
            let ray = scene.mainCamera.screenPointToRay(posX, posY);
            let hit = new Li.RaycastHit();
            if (scene.raycast(ray, hit)) {
                let point = hit.point;
                // 第二次左键单击结束
                if (cache.volumeMoving) {
                    cache.alphaVolume.delete();
                    cache.alphaVolume = null;
                    this.removeMouseEvent();
                    this.$emit("end", cache.points, cache.volume.extrudeHeight);
                    this.instance = cache.volume;
                    this._options.positions = cache.points;
                    cache.volume = null;
                    return;
                }
                cache.points.push(point);
                this.$emit("step", e, point);
            }
            hit.delete();
        }
        //右键事件
        if (e.button == 2 && cache.drawing && !cache.volumeMoving) {
            if (cache.points.length < 3) {
                return;
            }
            this.rightMouseEvent();
        }
    };
    ExtrudeEntity.prototype.mousemoveEvent = function (e) {
        let cache = this.cache;
        let posX = e.x;
        let posY = e.y;
        let tooltip = this.tooltip;
        tooltip.style.display = "block";
        tooltip.style.left = posX + 5 + "px";
        tooltip.style.top = posY + 5 + "px";
        if (cache.points.length == 0) {
            return;
        }
        let scene = viewer.scene;
        let ray = scene.mainCamera.screenPointToRay(posX, posY);
        let hit = new Li.RaycastHit();
        if (scene.raycast(ray, hit)) {
            let point = hit.point;
            //体积拉伸
            if (cache.volumeMoving) {
                //清除上一次移动生成的mesh
                if (cache.volume) {
                    cache.volume.delete();
                    cache.volume = null;
                }
                let height = point.toCartographic().height;
                let style = Object.assign({}, this._options.style, {
                    height: height,
                });
                let volume = this.extrudeEntity(cache.points, style);
                volume.extrudeHeight = height;
                cache.volume = volume;
                scene.addEntity(volume);
                volume.name = "volume";
                return;
            }
            if (cache.polygon) {
                cache.polygon.remove();
            }
            let polygon = new SSmap$1.graphic.Polygon({
                positions: [...cache.points, point],
                style: {
                    color: "#FF0000",
                    mode: "Absolute",
                    fillAlpha: 0.5,
                },
            });
            cache.polygon = polygon;
        }
        hit.delete();
    };
    ExtrudeEntity.prototype.rightMouseEvent = function () {
        let cache = this.cache;
        //生成透明体，用于鼠标移动获取高度
        if (!cache.alphaVolume) {
            let style = Object.assign({}, this._options.style, {
                height: 1000,
                color: "#ffff00",
                opacity: 0,
            });
            let alphaVolume = this.extrudeEntity(cache.points, style);
            //收集缓存对象
            cache.alphaVolume = alphaVolume;
            alphaVolume.name = "alphaVolume";
            cache.volumeMoving = true;
        }
        this.tooltip.innerText = "移动拉伸，左键结束";
        cache.polygon.remove();
        cache.polygon = null;
    };
    ExtrudeEntity.prototype.removeMouseEvent = function () {
        let cache = this.cache;
        let qtCanvas = viewer.canvasEl;
        if (cache.mousedown) {
            qtCanvas.removeEventListener("mousedown", cache.mousedown);
            cache.mousedown = null;
        }
        if (cache.mousemove) {
            document.removeEventListener("mousemove", cache.mousemove);
            cache.mousemove = null;
        }
        qtCanvas.style.cursor = "default";
        cache.drawing = false;
        this.removeTooltip();
    };
    ExtrudeEntity.prototype.end = function () {
        this.removeMouseEvent();
    };
    ExtrudeEntity.prototype.initTooltip = function (message) {
        let elem = document.createElement("div");
        elem.innerText = message;
        elem.style.cssText = `
            position: absolute;
            left: 0;
            top: 0;
            display: none;
            padding: 3px 6px;
            color: #fff;
            background-color: rgba(20, 20, 20, 0.6);
            font-size: 12px;
        `;
        document.body.appendChild(elem);
        this.tooltip = elem;
    };
    ExtrudeEntity.prototype.shapeToPolygon = function (options) {
        let positions = options.positions;
        let shape = options.shape;
        let origin = options.origin;
        let style = options.style;
        if (origin) {
            let { shape: points } = shape.extractPoints(style.segment);
            origin = normalizeVec3Array([origin])[0];
            //shape
            let rotation = Li.Quaternion.fromEulerAngles(180, 0, 0);
            positions = points.map((vec2) => {
                let point = vector3Offset(
                    origin,
                    {
                        offsetX: vec2.x + style.offsetX,
                        offsetY: vec2.y + style.offsetY,
                    },
                    rotation,
                    style.scale
                );
                return point;
            });
            let entity =
                options.type == "outline"
                    ? this.drawBuildingOutline(positions, style)
                    : this.extrudeEntity(positions, style);
            this.instance = entity;
        } else {
            throw new Error("空间坐标参数origin为空！");
        }
    };
    ExtrudeEntity.prototype.drawBuildingOutline = function (points, style) {
        let outer = new Li.Cartesian3Vector();
        points.forEach((point) => {
            if (typeof style.baseHeight == "number") {
                point = point.toCartographic();
                point.height = style.baseHeight;
            }
            outer.push_back(point.toCartesian3());
        });
        let extrudeEntity = new Li.BuildingOutline();
        extrudeEntity.setOuter(outer);
        extrudeEntity.extrudeHeight = style.height;
        extrudeEntity.altitude = style.baseHeight;
        extrudeEntity.url = style.imgUrl;
        //着色
        let color = color16ToRgb(style.color);
        extrudeEntity.color = Li.Color.fromRgb(color.r, color.g, color.b, 255);
        let lineColor = color16ToRgb(style.lineColor);
        extrudeEntity.strokeColor = Li.Color.fromRgb(
            lineColor.r,
            lineColor.g,
            lineColor.b,
            255
        );
        extrudeEntity.gradient = style.gradient;
        extrudeEntity.strokeWidth = style.linewidth;
        extrudeEntity.name = style.objectName;
        extrudeEntity.alpha = style.opacity;
        //动画
        let animation = style.animation;
        if (animation) {
            extrudeEntity.animationRun = true;
            extrudeEntity.animationType = Li.AnimationType[animation.type];
            extrudeEntity.animationTimer = animation.duration || 2000;
            extrudeEntity.cw = animation.cw;
        }
        extrudeEntity.create();
        extrudeEntity.parent = Li.Entity.root();
        outer.delete();
        return extrudeEntity;
    };
    ExtrudeEntity.prototype.extrudeEntity = function (points, style) {
        let scene = viewer.scene;
        //水平cart3集合
        let outer = new Li.Cartesian3Vector();
        points.forEach((point) => {
            if (typeof style.baseHeight == "number") {
                point = point.toCartographic();
                point.height = style.baseHeight;
            }
            outer.push_back(point.toCartesian3());
        });
        //拉伸体对象
        let extrudeEntity = new Li.ExtrudeEntity();
        extrudeEntity.setOuter(outer);
        extrudeEntity.extrudeHeight = style.height;
        extrudeEntity.altitude = style.baseHeight;

        //着色
        let color = color16ToRgb(style.color);
        extrudeEntity.color = Li.Color.fromRgb(color.r, color.g, color.b, 255);
        extrudeEntity.waterShader = style.waterShader;

        //纹理
        style.wallMap && (extrudeEntity.wallMap = style.wallMap);
        style.roofMap && (extrudeEntity.roofMap = style.roofMap);

        extrudeEntity.create();

        let entity = extrudeEntity.createEntity();
        entity.travalRenderers(function (renderer) {
            if (style.castShadow == true) {
                renderer.castShadow = true;
            }
            renderer.material.opacity = style.opacity;
        });
        entity.objectName = style.objectName;
        entity.tag = style.tag;
        //加入场景
        scene.addEntity(entity);
        outer.delete();
        extrudeEntity.delete();
        return entity;
    };
    ExtrudeEntity.prototype.removeTooltip = function () {
        if (this.tooltip) {
            document.body.removeChild(this.tooltip);
            this.tooltip = null;
        }
    };
    /**
     * @description 移除
     */
    ExtrudeEntity.prototype.remove = function () {
        this.cache = {
            points: [],
            list: [],
        };
        if (this.instance) {
            this.instance.delete();
            this.instance = null;
        }
    };
    Object.defineProperties(ExtrudeEntity.prototype, {
        /**
         * 拉伸高度
         * @memberof analyse.ExtrudeEntity.prototype
         * @type {Number}
         */
        height: {
            get() {
                if (this.instance) {
                    return this.instance.extrudeHeight;
                }
            },
            set(val) {
                if (this.instance) {
                    this.instance.delete();
                }
                let points = normalizeVec3Array(this._options.positions);
                let style = Object.assign({}, this._options.style, {
                    height: val,
                });
                this.instance = this.extrudeEntity(points, style);
            },
        },
    });
    return ExtrudeEntity;
}

class Vector2 {

	constructor( x = 0, y = 0 ) {

		Vector2.prototype.isVector2 = true;

		this.x = x;
		this.y = y;

	}

	get width() {

		return this.x;

	}

	set width( value ) {

		this.x = value;

	}

	get height() {

		return this.y;

	}

	set height( value ) {

		this.y = value;

	}

	set( x, y ) {

		this.x = x;
		this.y = y;

		return this;

	}

	setScalar( scalar ) {

		this.x = scalar;
		this.y = scalar;

		return this;

	}

	setX( x ) {

		this.x = x;

		return this;

	}

	setY( y ) {

		this.y = y;

		return this;

	}

	setComponent( index, value ) {

		switch ( index ) {

			case 0: this.x = value; break;
			case 1: this.y = value; break;
			default: throw new Error( 'index is out of range: ' + index );

		}

		return this;

	}

	getComponent( index ) {

		switch ( index ) {

			case 0: return this.x;
			case 1: return this.y;
			default: throw new Error( 'index is out of range: ' + index );

		}

	}

	clone() {

		return new this.constructor( this.x, this.y );

	}

	copy( v ) {

		this.x = v.x;
		this.y = v.y;

		return this;

	}

	add( v ) {

		this.x += v.x;
		this.y += v.y;

		return this;

	}

	addScalar( s ) {

		this.x += s;
		this.y += s;

		return this;

	}

	addVectors( a, b ) {

		this.x = a.x + b.x;
		this.y = a.y + b.y;

		return this;

	}

	addScaledVector( v, s ) {

		this.x += v.x * s;
		this.y += v.y * s;

		return this;

	}

	sub( v ) {

		this.x -= v.x;
		this.y -= v.y;

		return this;

	}

	subScalar( s ) {

		this.x -= s;
		this.y -= s;

		return this;

	}

	subVectors( a, b ) {

		this.x = a.x - b.x;
		this.y = a.y - b.y;

		return this;

	}

	multiply( v ) {

		this.x *= v.x;
		this.y *= v.y;

		return this;

	}

	multiplyScalar( scalar ) {

		this.x *= scalar;
		this.y *= scalar;

		return this;

	}

	divide( v ) {

		this.x /= v.x;
		this.y /= v.y;

		return this;

	}

	divideScalar( scalar ) {

		return this.multiplyScalar( 1 / scalar );

	}

	applyMatrix3( m ) {

		const x = this.x, y = this.y;
		const e = m.elements;

		this.x = e[ 0 ] * x + e[ 3 ] * y + e[ 6 ];
		this.y = e[ 1 ] * x + e[ 4 ] * y + e[ 7 ];

		return this;

	}

	min( v ) {

		this.x = Math.min( this.x, v.x );
		this.y = Math.min( this.y, v.y );

		return this;

	}

	max( v ) {

		this.x = Math.max( this.x, v.x );
		this.y = Math.max( this.y, v.y );

		return this;

	}

	clamp( min, max ) {

		// assumes min < max, componentwise

		this.x = Math.max( min.x, Math.min( max.x, this.x ) );
		this.y = Math.max( min.y, Math.min( max.y, this.y ) );

		return this;

	}

	clampScalar( minVal, maxVal ) {

		this.x = Math.max( minVal, Math.min( maxVal, this.x ) );
		this.y = Math.max( minVal, Math.min( maxVal, this.y ) );

		return this;

	}

	clampLength( min, max ) {

		const length = this.length();

		return this.divideScalar( length || 1 ).multiplyScalar( Math.max( min, Math.min( max, length ) ) );

	}

	floor() {

		this.x = Math.floor( this.x );
		this.y = Math.floor( this.y );

		return this;

	}

	ceil() {

		this.x = Math.ceil( this.x );
		this.y = Math.ceil( this.y );

		return this;

	}

	round() {

		this.x = Math.round( this.x );
		this.y = Math.round( this.y );

		return this;

	}

	roundToZero() {

		this.x = ( this.x < 0 ) ? Math.ceil( this.x ) : Math.floor( this.x );
		this.y = ( this.y < 0 ) ? Math.ceil( this.y ) : Math.floor( this.y );

		return this;

	}

	negate() {

		this.x = - this.x;
		this.y = - this.y;

		return this;

	}

	dot( v ) {

		return this.x * v.x + this.y * v.y;

	}

	cross( v ) {

		return this.x * v.y - this.y * v.x;

	}

	lengthSq() {

		return this.x * this.x + this.y * this.y;

	}

	length() {

		return Math.sqrt( this.x * this.x + this.y * this.y );

	}

	manhattanLength() {

		return Math.abs( this.x ) + Math.abs( this.y );

	}

	normalize() {

		return this.divideScalar( this.length() || 1 );

	}

	angle() {

		// computes the angle in radians with respect to the positive x-axis

		const angle = Math.atan2( - this.y, - this.x ) + Math.PI;

		return angle;

	}

	distanceTo( v ) {

		return Math.sqrt( this.distanceToSquared( v ) );

	}

	distanceToSquared( v ) {

		const dx = this.x - v.x, dy = this.y - v.y;
		return dx * dx + dy * dy;

	}

	manhattanDistanceTo( v ) {

		return Math.abs( this.x - v.x ) + Math.abs( this.y - v.y );

	}

	setLength( length ) {

		return this.normalize().multiplyScalar( length );

	}

	lerp( v, alpha ) {

		this.x += ( v.x - this.x ) * alpha;
		this.y += ( v.y - this.y ) * alpha;

		return this;

	}

	lerpVectors( v1, v2, alpha ) {

		this.x = v1.x + ( v2.x - v1.x ) * alpha;
		this.y = v1.y + ( v2.y - v1.y ) * alpha;

		return this;

	}

	equals( v ) {

		return ( ( v.x === this.x ) && ( v.y === this.y ) );

	}

	fromArray( array, offset = 0 ) {

		this.x = array[ offset ];
		this.y = array[ offset + 1 ];

		return this;

	}

	toArray( array = [], offset = 0 ) {

		array[ offset ] = this.x;
		array[ offset + 1 ] = this.y;

		return array;

	}

	fromBufferAttribute( attribute, index ) {

		this.x = attribute.getX( index );
		this.y = attribute.getY( index );

		return this;

	}

	rotateAround( center, angle ) {

		const c = Math.cos( angle ), s = Math.sin( angle );

		const x = this.x - center.x;
		const y = this.y - center.y;

		this.x = x * c - y * s + center.x;
		this.y = x * s + y * c + center.y;

		return this;

	}

	random() {

		this.x = Math.random();
		this.y = Math.random();

		return this;

	}

	*[ Symbol.iterator ]() {

		yield this.x;
		yield this.y;

	}

}

const _lut = [ '00', '01', '02', '03', '04', '05', '06', '07', '08', '09', '0a', '0b', '0c', '0d', '0e', '0f', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '1a', '1b', '1c', '1d', '1e', '1f', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '2a', '2b', '2c', '2d', '2e', '2f', '30', '31', '32', '33', '34', '35', '36', '37', '38', '39', '3a', '3b', '3c', '3d', '3e', '3f', '40', '41', '42', '43', '44', '45', '46', '47', '48', '49', '4a', '4b', '4c', '4d', '4e', '4f', '50', '51', '52', '53', '54', '55', '56', '57', '58', '59', '5a', '5b', '5c', '5d', '5e', '5f', '60', '61', '62', '63', '64', '65', '66', '67', '68', '69', '6a', '6b', '6c', '6d', '6e', '6f', '70', '71', '72', '73', '74', '75', '76', '77', '78', '79', '7a', '7b', '7c', '7d', '7e', '7f', '80', '81', '82', '83', '84', '85', '86', '87', '88', '89', '8a', '8b', '8c', '8d', '8e', '8f', '90', '91', '92', '93', '94', '95', '96', '97', '98', '99', '9a', '9b', '9c', '9d', '9e', '9f', 'a0', 'a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'a9', 'aa', 'ab', 'ac', 'ad', 'ae', 'af', 'b0', 'b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'b8', 'b9', 'ba', 'bb', 'bc', 'bd', 'be', 'bf', 'c0', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9', 'ca', 'cb', 'cc', 'cd', 'ce', 'cf', 'd0', 'd1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9', 'da', 'db', 'dc', 'dd', 'de', 'df', 'e0', 'e1', 'e2', 'e3', 'e4', 'e5', 'e6', 'e7', 'e8', 'e9', 'ea', 'eb', 'ec', 'ed', 'ee', 'ef', 'f0', 'f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'fa', 'fb', 'fc', 'fd', 'fe', 'ff' ];

// http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript/21963136#21963136
function generateUUID() {

	const d0 = Math.random() * 0xffffffff | 0;
	const d1 = Math.random() * 0xffffffff | 0;
	const d2 = Math.random() * 0xffffffff | 0;
	const d3 = Math.random() * 0xffffffff | 0;
	const uuid = _lut[ d0 & 0xff ] + _lut[ d0 >> 8 & 0xff ] + _lut[ d0 >> 16 & 0xff ] + _lut[ d0 >> 24 & 0xff ] + '-' +
			_lut[ d1 & 0xff ] + _lut[ d1 >> 8 & 0xff ] + '-' + _lut[ d1 >> 16 & 0x0f | 0x40 ] + _lut[ d1 >> 24 & 0xff ] + '-' +
			_lut[ d2 & 0x3f | 0x80 ] + _lut[ d2 >> 8 & 0xff ] + '-' + _lut[ d2 >> 16 & 0xff ] + _lut[ d2 >> 24 & 0xff ] +
			_lut[ d3 & 0xff ] + _lut[ d3 >> 8 & 0xff ] + _lut[ d3 >> 16 & 0xff ] + _lut[ d3 >> 24 & 0xff ];

	// .toLowerCase() here flattens concatenated strings to save heap memory space.
	return uuid.toLowerCase();

}

function clamp( value, min, max ) {

	return Math.max( min, Math.min( max, value ) );

}

// compute euclidean modulo of m % n
// https://en.wikipedia.org/wiki/Modulo_operation
function euclideanModulo( n, m ) {

	return ( ( n % m ) + m ) % m;

}

// https://en.wikipedia.org/wiki/Linear_interpolation
function lerp( x, y, t ) {

	return ( 1 - t ) * x + t * y;

}

class Quaternion {

	constructor( x = 0, y = 0, z = 0, w = 1 ) {

		this.isQuaternion = true;

		this._x = x;
		this._y = y;
		this._z = z;
		this._w = w;

	}

	static slerpFlat( dst, dstOffset, src0, srcOffset0, src1, srcOffset1, t ) {

		// fuzz-free, array-based Quaternion SLERP operation

		let x0 = src0[ srcOffset0 + 0 ],
			y0 = src0[ srcOffset0 + 1 ],
			z0 = src0[ srcOffset0 + 2 ],
			w0 = src0[ srcOffset0 + 3 ];

		const x1 = src1[ srcOffset1 + 0 ],
			y1 = src1[ srcOffset1 + 1 ],
			z1 = src1[ srcOffset1 + 2 ],
			w1 = src1[ srcOffset1 + 3 ];

		if ( t === 0 ) {

			dst[ dstOffset + 0 ] = x0;
			dst[ dstOffset + 1 ] = y0;
			dst[ dstOffset + 2 ] = z0;
			dst[ dstOffset + 3 ] = w0;
			return;

		}

		if ( t === 1 ) {

			dst[ dstOffset + 0 ] = x1;
			dst[ dstOffset + 1 ] = y1;
			dst[ dstOffset + 2 ] = z1;
			dst[ dstOffset + 3 ] = w1;
			return;

		}

		if ( w0 !== w1 || x0 !== x1 || y0 !== y1 || z0 !== z1 ) {

			let s = 1 - t;
			const cos = x0 * x1 + y0 * y1 + z0 * z1 + w0 * w1,
				dir = ( cos >= 0 ? 1 : - 1 ),
				sqrSin = 1 - cos * cos;

			// Skip the Slerp for tiny steps to avoid numeric problems:
			if ( sqrSin > Number.EPSILON ) {

				const sin = Math.sqrt( sqrSin ),
					len = Math.atan2( sin, cos * dir );

				s = Math.sin( s * len ) / sin;
				t = Math.sin( t * len ) / sin;

			}

			const tDir = t * dir;

			x0 = x0 * s + x1 * tDir;
			y0 = y0 * s + y1 * tDir;
			z0 = z0 * s + z1 * tDir;
			w0 = w0 * s + w1 * tDir;

			// Normalize in case we just did a lerp:
			if ( s === 1 - t ) {

				const f = 1 / Math.sqrt( x0 * x0 + y0 * y0 + z0 * z0 + w0 * w0 );

				x0 *= f;
				y0 *= f;
				z0 *= f;
				w0 *= f;

			}

		}

		dst[ dstOffset ] = x0;
		dst[ dstOffset + 1 ] = y0;
		dst[ dstOffset + 2 ] = z0;
		dst[ dstOffset + 3 ] = w0;

	}

	static multiplyQuaternionsFlat( dst, dstOffset, src0, srcOffset0, src1, srcOffset1 ) {

		const x0 = src0[ srcOffset0 ];
		const y0 = src0[ srcOffset0 + 1 ];
		const z0 = src0[ srcOffset0 + 2 ];
		const w0 = src0[ srcOffset0 + 3 ];

		const x1 = src1[ srcOffset1 ];
		const y1 = src1[ srcOffset1 + 1 ];
		const z1 = src1[ srcOffset1 + 2 ];
		const w1 = src1[ srcOffset1 + 3 ];

		dst[ dstOffset ] = x0 * w1 + w0 * x1 + y0 * z1 - z0 * y1;
		dst[ dstOffset + 1 ] = y0 * w1 + w0 * y1 + z0 * x1 - x0 * z1;
		dst[ dstOffset + 2 ] = z0 * w1 + w0 * z1 + x0 * y1 - y0 * x1;
		dst[ dstOffset + 3 ] = w0 * w1 - x0 * x1 - y0 * y1 - z0 * z1;

		return dst;

	}

	get x() {

		return this._x;

	}

	set x( value ) {

		this._x = value;
		this._onChangeCallback();

	}

	get y() {

		return this._y;

	}

	set y( value ) {

		this._y = value;
		this._onChangeCallback();

	}

	get z() {

		return this._z;

	}

	set z( value ) {

		this._z = value;
		this._onChangeCallback();

	}

	get w() {

		return this._w;

	}

	set w( value ) {

		this._w = value;
		this._onChangeCallback();

	}

	set( x, y, z, w ) {

		this._x = x;
		this._y = y;
		this._z = z;
		this._w = w;

		this._onChangeCallback();

		return this;

	}

	clone() {

		return new this.constructor( this._x, this._y, this._z, this._w );

	}

	copy( quaternion ) {

		this._x = quaternion.x;
		this._y = quaternion.y;
		this._z = quaternion.z;
		this._w = quaternion.w;

		this._onChangeCallback();

		return this;

	}

	setFromEuler( euler, update ) {

		if ( ! ( euler && euler.isEuler ) ) {

			throw new Error( 'THREE.Quaternion: .setFromEuler() now expects an Euler rotation rather than a Vector3 and order.' );

		}

		const x = euler._x, y = euler._y, z = euler._z, order = euler._order;

		// http://www.mathworks.com/matlabcentral/fileexchange/
		// 	20696-function-to-convert-between-dcm-euler-angles-quaternions-and-euler-vectors/
		//	content/SpinCalc.m

		const cos = Math.cos;
		const sin = Math.sin;

		const c1 = cos( x / 2 );
		const c2 = cos( y / 2 );
		const c3 = cos( z / 2 );

		const s1 = sin( x / 2 );
		const s2 = sin( y / 2 );
		const s3 = sin( z / 2 );

		switch ( order ) {

			case 'XYZ':
				this._x = s1 * c2 * c3 + c1 * s2 * s3;
				this._y = c1 * s2 * c3 - s1 * c2 * s3;
				this._z = c1 * c2 * s3 + s1 * s2 * c3;
				this._w = c1 * c2 * c3 - s1 * s2 * s3;
				break;

			case 'YXZ':
				this._x = s1 * c2 * c3 + c1 * s2 * s3;
				this._y = c1 * s2 * c3 - s1 * c2 * s3;
				this._z = c1 * c2 * s3 - s1 * s2 * c3;
				this._w = c1 * c2 * c3 + s1 * s2 * s3;
				break;

			case 'ZXY':
				this._x = s1 * c2 * c3 - c1 * s2 * s3;
				this._y = c1 * s2 * c3 + s1 * c2 * s3;
				this._z = c1 * c2 * s3 + s1 * s2 * c3;
				this._w = c1 * c2 * c3 - s1 * s2 * s3;
				break;

			case 'ZYX':
				this._x = s1 * c2 * c3 - c1 * s2 * s3;
				this._y = c1 * s2 * c3 + s1 * c2 * s3;
				this._z = c1 * c2 * s3 - s1 * s2 * c3;
				this._w = c1 * c2 * c3 + s1 * s2 * s3;
				break;

			case 'YZX':
				this._x = s1 * c2 * c3 + c1 * s2 * s3;
				this._y = c1 * s2 * c3 + s1 * c2 * s3;
				this._z = c1 * c2 * s3 - s1 * s2 * c3;
				this._w = c1 * c2 * c3 - s1 * s2 * s3;
				break;

			case 'XZY':
				this._x = s1 * c2 * c3 - c1 * s2 * s3;
				this._y = c1 * s2 * c3 - s1 * c2 * s3;
				this._z = c1 * c2 * s3 + s1 * s2 * c3;
				this._w = c1 * c2 * c3 + s1 * s2 * s3;
				break;

			default:
				console.warn( 'THREE.Quaternion: .setFromEuler() encountered an unknown order: ' + order );

		}

		if ( update !== false ) this._onChangeCallback();

		return this;

	}

	setFromAxisAngle( axis, angle ) {

		// http://www.euclideanspace.com/maths/geometry/rotations/conversions/angleToQuaternion/index.htm

		// assumes axis is normalized

		const halfAngle = angle / 2, s = Math.sin( halfAngle );

		this._x = axis.x * s;
		this._y = axis.y * s;
		this._z = axis.z * s;
		this._w = Math.cos( halfAngle );

		this._onChangeCallback();

		return this;

	}

	setFromRotationMatrix( m ) {

		// http://www.euclideanspace.com/maths/geometry/rotations/conversions/matrixToQuaternion/index.htm

		// assumes the upper 3x3 of m is a pure rotation matrix (i.e, unscaled)

		const te = m.elements,

			m11 = te[ 0 ], m12 = te[ 4 ], m13 = te[ 8 ],
			m21 = te[ 1 ], m22 = te[ 5 ], m23 = te[ 9 ],
			m31 = te[ 2 ], m32 = te[ 6 ], m33 = te[ 10 ],

			trace = m11 + m22 + m33;

		if ( trace > 0 ) {

			const s = 0.5 / Math.sqrt( trace + 1.0 );

			this._w = 0.25 / s;
			this._x = ( m32 - m23 ) * s;
			this._y = ( m13 - m31 ) * s;
			this._z = ( m21 - m12 ) * s;

		} else if ( m11 > m22 && m11 > m33 ) {

			const s = 2.0 * Math.sqrt( 1.0 + m11 - m22 - m33 );

			this._w = ( m32 - m23 ) / s;
			this._x = 0.25 * s;
			this._y = ( m12 + m21 ) / s;
			this._z = ( m13 + m31 ) / s;

		} else if ( m22 > m33 ) {

			const s = 2.0 * Math.sqrt( 1.0 + m22 - m11 - m33 );

			this._w = ( m13 - m31 ) / s;
			this._x = ( m12 + m21 ) / s;
			this._y = 0.25 * s;
			this._z = ( m23 + m32 ) / s;

		} else {

			const s = 2.0 * Math.sqrt( 1.0 + m33 - m11 - m22 );

			this._w = ( m21 - m12 ) / s;
			this._x = ( m13 + m31 ) / s;
			this._y = ( m23 + m32 ) / s;
			this._z = 0.25 * s;

		}

		this._onChangeCallback();

		return this;

	}

	setFromUnitVectors( vFrom, vTo ) {

		// assumes direction vectors vFrom and vTo are normalized

		let r = vFrom.dot( vTo ) + 1;

		if ( r < Number.EPSILON ) {

			// vFrom and vTo point in opposite directions

			r = 0;

			if ( Math.abs( vFrom.x ) > Math.abs( vFrom.z ) ) {

				this._x = - vFrom.y;
				this._y = vFrom.x;
				this._z = 0;
				this._w = r;

			} else {

				this._x = 0;
				this._y = - vFrom.z;
				this._z = vFrom.y;
				this._w = r;

			}

		} else {

			// crossVectors( vFrom, vTo ); // inlined to avoid cyclic dependency on Vector3

			this._x = vFrom.y * vTo.z - vFrom.z * vTo.y;
			this._y = vFrom.z * vTo.x - vFrom.x * vTo.z;
			this._z = vFrom.x * vTo.y - vFrom.y * vTo.x;
			this._w = r;

		}

		return this.normalize();

	}

	angleTo( q ) {

		return 2 * Math.acos( Math.abs( clamp( this.dot( q ), - 1, 1 ) ) );

	}

	rotateTowards( q, step ) {

		const angle = this.angleTo( q );

		if ( angle === 0 ) return this;

		const t = Math.min( 1, step / angle );

		this.slerp( q, t );

		return this;

	}

	identity() {

		return this.set( 0, 0, 0, 1 );

	}

	invert() {

		// quaternion is assumed to have unit length

		return this.conjugate();

	}

	conjugate() {

		this._x *= - 1;
		this._y *= - 1;
		this._z *= - 1;

		this._onChangeCallback();

		return this;

	}

	dot( v ) {

		return this._x * v._x + this._y * v._y + this._z * v._z + this._w * v._w;

	}

	lengthSq() {

		return this._x * this._x + this._y * this._y + this._z * this._z + this._w * this._w;

	}

	length() {

		return Math.sqrt( this._x * this._x + this._y * this._y + this._z * this._z + this._w * this._w );

	}

	normalize() {

		let l = this.length();

		if ( l === 0 ) {

			this._x = 0;
			this._y = 0;
			this._z = 0;
			this._w = 1;

		} else {

			l = 1 / l;

			this._x = this._x * l;
			this._y = this._y * l;
			this._z = this._z * l;
			this._w = this._w * l;

		}

		this._onChangeCallback();

		return this;

	}

	multiply( q ) {

		return this.multiplyQuaternions( this, q );

	}

	premultiply( q ) {

		return this.multiplyQuaternions( q, this );

	}

	multiplyQuaternions( a, b ) {

		// from http://www.euclideanspace.com/maths/algebra/realNormedAlgebra/quaternions/code/index.htm

		const qax = a._x, qay = a._y, qaz = a._z, qaw = a._w;
		const qbx = b._x, qby = b._y, qbz = b._z, qbw = b._w;

		this._x = qax * qbw + qaw * qbx + qay * qbz - qaz * qby;
		this._y = qay * qbw + qaw * qby + qaz * qbx - qax * qbz;
		this._z = qaz * qbw + qaw * qbz + qax * qby - qay * qbx;
		this._w = qaw * qbw - qax * qbx - qay * qby - qaz * qbz;

		this._onChangeCallback();

		return this;

	}

	slerp( qb, t ) {

		if ( t === 0 ) return this;
		if ( t === 1 ) return this.copy( qb );

		const x = this._x, y = this._y, z = this._z, w = this._w;

		// http://www.euclideanspace.com/maths/algebra/realNormedAlgebra/quaternions/slerp/

		let cosHalfTheta = w * qb._w + x * qb._x + y * qb._y + z * qb._z;

		if ( cosHalfTheta < 0 ) {

			this._w = - qb._w;
			this._x = - qb._x;
			this._y = - qb._y;
			this._z = - qb._z;

			cosHalfTheta = - cosHalfTheta;

		} else {

			this.copy( qb );

		}

		if ( cosHalfTheta >= 1.0 ) {

			this._w = w;
			this._x = x;
			this._y = y;
			this._z = z;

			return this;

		}

		const sqrSinHalfTheta = 1.0 - cosHalfTheta * cosHalfTheta;

		if ( sqrSinHalfTheta <= Number.EPSILON ) {

			const s = 1 - t;
			this._w = s * w + t * this._w;
			this._x = s * x + t * this._x;
			this._y = s * y + t * this._y;
			this._z = s * z + t * this._z;

			this.normalize();
			this._onChangeCallback();

			return this;

		}

		const sinHalfTheta = Math.sqrt( sqrSinHalfTheta );
		const halfTheta = Math.atan2( sinHalfTheta, cosHalfTheta );
		const ratioA = Math.sin( ( 1 - t ) * halfTheta ) / sinHalfTheta,
			ratioB = Math.sin( t * halfTheta ) / sinHalfTheta;

		this._w = ( w * ratioA + this._w * ratioB );
		this._x = ( x * ratioA + this._x * ratioB );
		this._y = ( y * ratioA + this._y * ratioB );
		this._z = ( z * ratioA + this._z * ratioB );

		this._onChangeCallback();

		return this;

	}

	slerpQuaternions( qa, qb, t ) {

		return this.copy( qa ).slerp( qb, t );

	}

	random() {

		// Derived from http://planning.cs.uiuc.edu/node198.html
		// Note, this source uses w, x, y, z ordering,
		// so we swap the order below.

		const u1 = Math.random();
		const sqrt1u1 = Math.sqrt( 1 - u1 );
		const sqrtu1 = Math.sqrt( u1 );

		const u2 = 2 * Math.PI * Math.random();

		const u3 = 2 * Math.PI * Math.random();

		return this.set(
			sqrt1u1 * Math.cos( u2 ),
			sqrtu1 * Math.sin( u3 ),
			sqrtu1 * Math.cos( u3 ),
			sqrt1u1 * Math.sin( u2 ),
		);

	}

	equals( quaternion ) {

		return ( quaternion._x === this._x ) && ( quaternion._y === this._y ) && ( quaternion._z === this._z ) && ( quaternion._w === this._w );

	}

	fromArray( array, offset = 0 ) {

		this._x = array[ offset ];
		this._y = array[ offset + 1 ];
		this._z = array[ offset + 2 ];
		this._w = array[ offset + 3 ];

		this._onChangeCallback();

		return this;

	}

	toArray( array = [], offset = 0 ) {

		array[ offset ] = this._x;
		array[ offset + 1 ] = this._y;
		array[ offset + 2 ] = this._z;
		array[ offset + 3 ] = this._w;

		return array;

	}

	fromBufferAttribute( attribute, index ) {

		this._x = attribute.getX( index );
		this._y = attribute.getY( index );
		this._z = attribute.getZ( index );
		this._w = attribute.getW( index );

		return this;

	}

	_onChange( callback ) {

		this._onChangeCallback = callback;

		return this;

	}

	_onChangeCallback() {}

	*[ Symbol.iterator ]() {

		yield this._x;
		yield this._y;
		yield this._z;
		yield this._w;

	}

}

class Vector3 {

	constructor( x = 0, y = 0, z = 0 ) {

		Vector3.prototype.isVector3 = true;

		this.x = x;
		this.y = y;
		this.z = z;

	}

	set( x, y, z ) {

		if ( z === undefined ) z = this.z; // sprite.scale.set(x,y)

		this.x = x;
		this.y = y;
		this.z = z;

		return this;

	}

	setScalar( scalar ) {

		this.x = scalar;
		this.y = scalar;
		this.z = scalar;

		return this;

	}

	setX( x ) {

		this.x = x;

		return this;

	}

	setY( y ) {

		this.y = y;

		return this;

	}

	setZ( z ) {

		this.z = z;

		return this;

	}

	setComponent( index, value ) {

		switch ( index ) {

			case 0: this.x = value; break;
			case 1: this.y = value; break;
			case 2: this.z = value; break;
			default: throw new Error( 'index is out of range: ' + index );

		}

		return this;

	}

	getComponent( index ) {

		switch ( index ) {

			case 0: return this.x;
			case 1: return this.y;
			case 2: return this.z;
			default: throw new Error( 'index is out of range: ' + index );

		}

	}

	clone() {

		return new this.constructor( this.x, this.y, this.z );

	}

	copy( v ) {

		this.x = v.x;
		this.y = v.y;
		this.z = v.z;

		return this;

	}

	add( v ) {

		this.x += v.x;
		this.y += v.y;
		this.z += v.z;

		return this;

	}

	addScalar( s ) {

		this.x += s;
		this.y += s;
		this.z += s;

		return this;

	}

	addVectors( a, b ) {

		this.x = a.x + b.x;
		this.y = a.y + b.y;
		this.z = a.z + b.z;

		return this;

	}

	addScaledVector( v, s ) {

		this.x += v.x * s;
		this.y += v.y * s;
		this.z += v.z * s;

		return this;

	}

	sub( v ) {

		this.x -= v.x;
		this.y -= v.y;
		this.z -= v.z;

		return this;

	}

	subScalar( s ) {

		this.x -= s;
		this.y -= s;
		this.z -= s;

		return this;

	}

	subVectors( a, b ) {

		this.x = a.x - b.x;
		this.y = a.y - b.y;
		this.z = a.z - b.z;

		return this;

	}

	multiply( v ) {

		this.x *= v.x;
		this.y *= v.y;
		this.z *= v.z;

		return this;

	}

	multiplyScalar( scalar ) {

		this.x *= scalar;
		this.y *= scalar;
		this.z *= scalar;

		return this;

	}

	multiplyVectors( a, b ) {

		this.x = a.x * b.x;
		this.y = a.y * b.y;
		this.z = a.z * b.z;

		return this;

	}

	applyEuler( euler ) {

		return this.applyQuaternion( _quaternion.setFromEuler( euler ) );

	}

	applyAxisAngle( axis, angle ) {

		return this.applyQuaternion( _quaternion.setFromAxisAngle( axis, angle ) );

	}

	applyMatrix3( m ) {

		const x = this.x, y = this.y, z = this.z;
		const e = m.elements;

		this.x = e[ 0 ] * x + e[ 3 ] * y + e[ 6 ] * z;
		this.y = e[ 1 ] * x + e[ 4 ] * y + e[ 7 ] * z;
		this.z = e[ 2 ] * x + e[ 5 ] * y + e[ 8 ] * z;

		return this;

	}

	applyNormalMatrix( m ) {

		return this.applyMatrix3( m ).normalize();

	}

	applyMatrix4( m ) {

		const x = this.x, y = this.y, z = this.z;
		const e = m.elements;

		const w = 1 / ( e[ 3 ] * x + e[ 7 ] * y + e[ 11 ] * z + e[ 15 ] );

		this.x = ( e[ 0 ] * x + e[ 4 ] * y + e[ 8 ] * z + e[ 12 ] ) * w;
		this.y = ( e[ 1 ] * x + e[ 5 ] * y + e[ 9 ] * z + e[ 13 ] ) * w;
		this.z = ( e[ 2 ] * x + e[ 6 ] * y + e[ 10 ] * z + e[ 14 ] ) * w;

		return this;

	}

	applyQuaternion( q ) {

		const x = this.x, y = this.y, z = this.z;
		const qx = q.x, qy = q.y, qz = q.z, qw = q.w;

		// calculate quat * vector

		const ix = qw * x + qy * z - qz * y;
		const iy = qw * y + qz * x - qx * z;
		const iz = qw * z + qx * y - qy * x;
		const iw = - qx * x - qy * y - qz * z;

		// calculate result * inverse quat

		this.x = ix * qw + iw * - qx + iy * - qz - iz * - qy;
		this.y = iy * qw + iw * - qy + iz * - qx - ix * - qz;
		this.z = iz * qw + iw * - qz + ix * - qy - iy * - qx;

		return this;

	}

	project( camera ) {

		return this.applyMatrix4( camera.matrixWorldInverse ).applyMatrix4( camera.projectionMatrix );

	}

	unproject( camera ) {

		return this.applyMatrix4( camera.projectionMatrixInverse ).applyMatrix4( camera.matrixWorld );

	}

	transformDirection( m ) {

		// input: THREE.Matrix4 affine matrix
		// vector interpreted as a direction

		const x = this.x, y = this.y, z = this.z;
		const e = m.elements;

		this.x = e[ 0 ] * x + e[ 4 ] * y + e[ 8 ] * z;
		this.y = e[ 1 ] * x + e[ 5 ] * y + e[ 9 ] * z;
		this.z = e[ 2 ] * x + e[ 6 ] * y + e[ 10 ] * z;

		return this.normalize();

	}

	divide( v ) {

		this.x /= v.x;
		this.y /= v.y;
		this.z /= v.z;

		return this;

	}

	divideScalar( scalar ) {

		return this.multiplyScalar( 1 / scalar );

	}

	min( v ) {

		this.x = Math.min( this.x, v.x );
		this.y = Math.min( this.y, v.y );
		this.z = Math.min( this.z, v.z );

		return this;

	}

	max( v ) {

		this.x = Math.max( this.x, v.x );
		this.y = Math.max( this.y, v.y );
		this.z = Math.max( this.z, v.z );

		return this;

	}

	clamp( min, max ) {

		// assumes min < max, componentwise

		this.x = Math.max( min.x, Math.min( max.x, this.x ) );
		this.y = Math.max( min.y, Math.min( max.y, this.y ) );
		this.z = Math.max( min.z, Math.min( max.z, this.z ) );

		return this;

	}

	clampScalar( minVal, maxVal ) {

		this.x = Math.max( minVal, Math.min( maxVal, this.x ) );
		this.y = Math.max( minVal, Math.min( maxVal, this.y ) );
		this.z = Math.max( minVal, Math.min( maxVal, this.z ) );

		return this;

	}

	clampLength( min, max ) {

		const length = this.length();

		return this.divideScalar( length || 1 ).multiplyScalar( Math.max( min, Math.min( max, length ) ) );

	}

	floor() {

		this.x = Math.floor( this.x );
		this.y = Math.floor( this.y );
		this.z = Math.floor( this.z );

		return this;

	}

	ceil() {

		this.x = Math.ceil( this.x );
		this.y = Math.ceil( this.y );
		this.z = Math.ceil( this.z );

		return this;

	}

	round() {

		this.x = Math.round( this.x );
		this.y = Math.round( this.y );
		this.z = Math.round( this.z );

		return this;

	}

	roundToZero() {

		this.x = ( this.x < 0 ) ? Math.ceil( this.x ) : Math.floor( this.x );
		this.y = ( this.y < 0 ) ? Math.ceil( this.y ) : Math.floor( this.y );
		this.z = ( this.z < 0 ) ? Math.ceil( this.z ) : Math.floor( this.z );

		return this;

	}

	negate() {

		this.x = - this.x;
		this.y = - this.y;
		this.z = - this.z;

		return this;

	}

	dot( v ) {

		return this.x * v.x + this.y * v.y + this.z * v.z;

	}

	// TODO lengthSquared?

	lengthSq() {

		return this.x * this.x + this.y * this.y + this.z * this.z;

	}

	length() {

		return Math.sqrt( this.x * this.x + this.y * this.y + this.z * this.z );

	}

	manhattanLength() {

		return Math.abs( this.x ) + Math.abs( this.y ) + Math.abs( this.z );

	}

	normalize() {

		return this.divideScalar( this.length() || 1 );

	}

	setLength( length ) {

		return this.normalize().multiplyScalar( length );

	}

	lerp( v, alpha ) {

		this.x += ( v.x - this.x ) * alpha;
		this.y += ( v.y - this.y ) * alpha;
		this.z += ( v.z - this.z ) * alpha;

		return this;

	}

	lerpVectors( v1, v2, alpha ) {

		this.x = v1.x + ( v2.x - v1.x ) * alpha;
		this.y = v1.y + ( v2.y - v1.y ) * alpha;
		this.z = v1.z + ( v2.z - v1.z ) * alpha;

		return this;

	}

	cross( v ) {

		return this.crossVectors( this, v );

	}

	crossVectors( a, b ) {

		const ax = a.x, ay = a.y, az = a.z;
		const bx = b.x, by = b.y, bz = b.z;

		this.x = ay * bz - az * by;
		this.y = az * bx - ax * bz;
		this.z = ax * by - ay * bx;

		return this;

	}

	projectOnVector( v ) {

		const denominator = v.lengthSq();

		if ( denominator === 0 ) return this.set( 0, 0, 0 );

		const scalar = v.dot( this ) / denominator;

		return this.copy( v ).multiplyScalar( scalar );

	}

	projectOnPlane( planeNormal ) {

		_vector.copy( this ).projectOnVector( planeNormal );

		return this.sub( _vector );

	}

	reflect( normal ) {

		// reflect incident vector off plane orthogonal to normal
		// normal is assumed to have unit length

		return this.sub( _vector.copy( normal ).multiplyScalar( 2 * this.dot( normal ) ) );

	}

	angleTo( v ) {

		const denominator = Math.sqrt( this.lengthSq() * v.lengthSq() );

		if ( denominator === 0 ) return Math.PI / 2;

		const theta = this.dot( v ) / denominator;

		// clamp, to handle numerical problems

		return Math.acos( clamp( theta, - 1, 1 ) );

	}

	distanceTo( v ) {

		return Math.sqrt( this.distanceToSquared( v ) );

	}

	distanceToSquared( v ) {

		const dx = this.x - v.x, dy = this.y - v.y, dz = this.z - v.z;

		return dx * dx + dy * dy + dz * dz;

	}

	manhattanDistanceTo( v ) {

		return Math.abs( this.x - v.x ) + Math.abs( this.y - v.y ) + Math.abs( this.z - v.z );

	}

	setFromSpherical( s ) {

		return this.setFromSphericalCoords( s.radius, s.phi, s.theta );

	}

	setFromSphericalCoords( radius, phi, theta ) {

		const sinPhiRadius = Math.sin( phi ) * radius;

		this.x = sinPhiRadius * Math.sin( theta );
		this.y = Math.cos( phi ) * radius;
		this.z = sinPhiRadius * Math.cos( theta );

		return this;

	}

	setFromCylindrical( c ) {

		return this.setFromCylindricalCoords( c.radius, c.theta, c.y );

	}

	setFromCylindricalCoords( radius, theta, y ) {

		this.x = radius * Math.sin( theta );
		this.y = y;
		this.z = radius * Math.cos( theta );

		return this;

	}

	setFromMatrixPosition( m ) {

		const e = m.elements;

		this.x = e[ 12 ];
		this.y = e[ 13 ];
		this.z = e[ 14 ];

		return this;

	}

	setFromMatrixScale( m ) {

		const sx = this.setFromMatrixColumn( m, 0 ).length();
		const sy = this.setFromMatrixColumn( m, 1 ).length();
		const sz = this.setFromMatrixColumn( m, 2 ).length();

		this.x = sx;
		this.y = sy;
		this.z = sz;

		return this;

	}

	setFromMatrixColumn( m, index ) {

		return this.fromArray( m.elements, index * 4 );

	}

	setFromMatrix3Column( m, index ) {

		return this.fromArray( m.elements, index * 3 );

	}

	setFromEuler( e ) {

		this.x = e._x;
		this.y = e._y;
		this.z = e._z;

		return this;

	}

	equals( v ) {

		return ( ( v.x === this.x ) && ( v.y === this.y ) && ( v.z === this.z ) );

	}

	fromArray( array, offset = 0 ) {

		this.x = array[ offset ];
		this.y = array[ offset + 1 ];
		this.z = array[ offset + 2 ];

		return this;

	}

	toArray( array = [], offset = 0 ) {

		array[ offset ] = this.x;
		array[ offset + 1 ] = this.y;
		array[ offset + 2 ] = this.z;

		return array;

	}

	fromBufferAttribute( attribute, index ) {

		this.x = attribute.getX( index );
		this.y = attribute.getY( index );
		this.z = attribute.getZ( index );

		return this;

	}

	random() {

		this.x = Math.random();
		this.y = Math.random();
		this.z = Math.random();

		return this;

	}

	randomDirection() {

		// Derived from https://mathworld.wolfram.com/SpherePointPicking.html

		const u = ( Math.random() - 0.5 ) * 2;
		const t = Math.random() * Math.PI * 2;
		const f = Math.sqrt( 1 - u ** 2 );

		this.x = f * Math.cos( t );
		this.y = f * Math.sin( t );
		this.z = u;

		return this;

	}

	*[ Symbol.iterator ]() {

		yield this.x;
		yield this.y;
		yield this.z;

	}

}

const _vector = /*@__PURE__*/ new Vector3();
const _quaternion = /*@__PURE__*/ new Quaternion();

class Matrix4 {

	constructor() {

		Matrix4.prototype.isMatrix4 = true;

		this.elements = [

			1, 0, 0, 0,
			0, 1, 0, 0,
			0, 0, 1, 0,
			0, 0, 0, 1

		];

	}

	set( n11, n12, n13, n14, n21, n22, n23, n24, n31, n32, n33, n34, n41, n42, n43, n44 ) {

		const te = this.elements;

		te[ 0 ] = n11; te[ 4 ] = n12; te[ 8 ] = n13; te[ 12 ] = n14;
		te[ 1 ] = n21; te[ 5 ] = n22; te[ 9 ] = n23; te[ 13 ] = n24;
		te[ 2 ] = n31; te[ 6 ] = n32; te[ 10 ] = n33; te[ 14 ] = n34;
		te[ 3 ] = n41; te[ 7 ] = n42; te[ 11 ] = n43; te[ 15 ] = n44;

		return this;

	}

	identity() {

		this.set(

			1, 0, 0, 0,
			0, 1, 0, 0,
			0, 0, 1, 0,
			0, 0, 0, 1

		);

		return this;

	}

	clone() {

		return new Matrix4().fromArray( this.elements );

	}

	copy( m ) {

		const te = this.elements;
		const me = m.elements;

		te[ 0 ] = me[ 0 ]; te[ 1 ] = me[ 1 ]; te[ 2 ] = me[ 2 ]; te[ 3 ] = me[ 3 ];
		te[ 4 ] = me[ 4 ]; te[ 5 ] = me[ 5 ]; te[ 6 ] = me[ 6 ]; te[ 7 ] = me[ 7 ];
		te[ 8 ] = me[ 8 ]; te[ 9 ] = me[ 9 ]; te[ 10 ] = me[ 10 ]; te[ 11 ] = me[ 11 ];
		te[ 12 ] = me[ 12 ]; te[ 13 ] = me[ 13 ]; te[ 14 ] = me[ 14 ]; te[ 15 ] = me[ 15 ];

		return this;

	}

	copyPosition( m ) {

		const te = this.elements, me = m.elements;

		te[ 12 ] = me[ 12 ];
		te[ 13 ] = me[ 13 ];
		te[ 14 ] = me[ 14 ];

		return this;

	}

	setFromMatrix3( m ) {

		const me = m.elements;

		this.set(

			me[ 0 ], me[ 3 ], me[ 6 ], 0,
			me[ 1 ], me[ 4 ], me[ 7 ], 0,
			me[ 2 ], me[ 5 ], me[ 8 ], 0,
			0, 0, 0, 1

		);

		return this;

	}

	extractBasis( xAxis, yAxis, zAxis ) {

		xAxis.setFromMatrixColumn( this, 0 );
		yAxis.setFromMatrixColumn( this, 1 );
		zAxis.setFromMatrixColumn( this, 2 );

		return this;

	}

	makeBasis( xAxis, yAxis, zAxis ) {

		this.set(
			xAxis.x, yAxis.x, zAxis.x, 0,
			xAxis.y, yAxis.y, zAxis.y, 0,
			xAxis.z, yAxis.z, zAxis.z, 0,
			0, 0, 0, 1
		);

		return this;

	}

	extractRotation( m ) {

		// this method does not support reflection matrices

		const te = this.elements;
		const me = m.elements;

		const scaleX = 1 / _v1.setFromMatrixColumn( m, 0 ).length();
		const scaleY = 1 / _v1.setFromMatrixColumn( m, 1 ).length();
		const scaleZ = 1 / _v1.setFromMatrixColumn( m, 2 ).length();

		te[ 0 ] = me[ 0 ] * scaleX;
		te[ 1 ] = me[ 1 ] * scaleX;
		te[ 2 ] = me[ 2 ] * scaleX;
		te[ 3 ] = 0;

		te[ 4 ] = me[ 4 ] * scaleY;
		te[ 5 ] = me[ 5 ] * scaleY;
		te[ 6 ] = me[ 6 ] * scaleY;
		te[ 7 ] = 0;

		te[ 8 ] = me[ 8 ] * scaleZ;
		te[ 9 ] = me[ 9 ] * scaleZ;
		te[ 10 ] = me[ 10 ] * scaleZ;
		te[ 11 ] = 0;

		te[ 12 ] = 0;
		te[ 13 ] = 0;
		te[ 14 ] = 0;
		te[ 15 ] = 1;

		return this;

	}

	makeRotationFromEuler( euler ) {

		const te = this.elements;

		const x = euler.x, y = euler.y, z = euler.z;
		const a = Math.cos( x ), b = Math.sin( x );
		const c = Math.cos( y ), d = Math.sin( y );
		const e = Math.cos( z ), f = Math.sin( z );

		if ( euler.order === 'XYZ' ) {

			const ae = a * e, af = a * f, be = b * e, bf = b * f;

			te[ 0 ] = c * e;
			te[ 4 ] = - c * f;
			te[ 8 ] = d;

			te[ 1 ] = af + be * d;
			te[ 5 ] = ae - bf * d;
			te[ 9 ] = - b * c;

			te[ 2 ] = bf - ae * d;
			te[ 6 ] = be + af * d;
			te[ 10 ] = a * c;

		} else if ( euler.order === 'YXZ' ) {

			const ce = c * e, cf = c * f, de = d * e, df = d * f;

			te[ 0 ] = ce + df * b;
			te[ 4 ] = de * b - cf;
			te[ 8 ] = a * d;

			te[ 1 ] = a * f;
			te[ 5 ] = a * e;
			te[ 9 ] = - b;

			te[ 2 ] = cf * b - de;
			te[ 6 ] = df + ce * b;
			te[ 10 ] = a * c;

		} else if ( euler.order === 'ZXY' ) {

			const ce = c * e, cf = c * f, de = d * e, df = d * f;

			te[ 0 ] = ce - df * b;
			te[ 4 ] = - a * f;
			te[ 8 ] = de + cf * b;

			te[ 1 ] = cf + de * b;
			te[ 5 ] = a * e;
			te[ 9 ] = df - ce * b;

			te[ 2 ] = - a * d;
			te[ 6 ] = b;
			te[ 10 ] = a * c;

		} else if ( euler.order === 'ZYX' ) {

			const ae = a * e, af = a * f, be = b * e, bf = b * f;

			te[ 0 ] = c * e;
			te[ 4 ] = be * d - af;
			te[ 8 ] = ae * d + bf;

			te[ 1 ] = c * f;
			te[ 5 ] = bf * d + ae;
			te[ 9 ] = af * d - be;

			te[ 2 ] = - d;
			te[ 6 ] = b * c;
			te[ 10 ] = a * c;

		} else if ( euler.order === 'YZX' ) {

			const ac = a * c, ad = a * d, bc = b * c, bd = b * d;

			te[ 0 ] = c * e;
			te[ 4 ] = bd - ac * f;
			te[ 8 ] = bc * f + ad;

			te[ 1 ] = f;
			te[ 5 ] = a * e;
			te[ 9 ] = - b * e;

			te[ 2 ] = - d * e;
			te[ 6 ] = ad * f + bc;
			te[ 10 ] = ac - bd * f;

		} else if ( euler.order === 'XZY' ) {

			const ac = a * c, ad = a * d, bc = b * c, bd = b * d;

			te[ 0 ] = c * e;
			te[ 4 ] = - f;
			te[ 8 ] = d * e;

			te[ 1 ] = ac * f + bd;
			te[ 5 ] = a * e;
			te[ 9 ] = ad * f - bc;

			te[ 2 ] = bc * f - ad;
			te[ 6 ] = b * e;
			te[ 10 ] = bd * f + ac;

		}

		// bottom row
		te[ 3 ] = 0;
		te[ 7 ] = 0;
		te[ 11 ] = 0;

		// last column
		te[ 12 ] = 0;
		te[ 13 ] = 0;
		te[ 14 ] = 0;
		te[ 15 ] = 1;

		return this;

	}

	makeRotationFromQuaternion( q ) {

		return this.compose( _zero, q, _one );

	}

	lookAt( eye, target, up ) {

		const te = this.elements;

		_z.subVectors( eye, target );

		if ( _z.lengthSq() === 0 ) {

			// eye and target are in the same position

			_z.z = 1;

		}

		_z.normalize();
		_x.crossVectors( up, _z );

		if ( _x.lengthSq() === 0 ) {

			// up and z are parallel

			if ( Math.abs( up.z ) === 1 ) {

				_z.x += 0.0001;

			} else {

				_z.z += 0.0001;

			}

			_z.normalize();
			_x.crossVectors( up, _z );

		}

		_x.normalize();
		_y.crossVectors( _z, _x );

		te[ 0 ] = _x.x; te[ 4 ] = _y.x; te[ 8 ] = _z.x;
		te[ 1 ] = _x.y; te[ 5 ] = _y.y; te[ 9 ] = _z.y;
		te[ 2 ] = _x.z; te[ 6 ] = _y.z; te[ 10 ] = _z.z;

		return this;

	}

	multiply( m ) {

		return this.multiplyMatrices( this, m );

	}

	premultiply( m ) {

		return this.multiplyMatrices( m, this );

	}

	multiplyMatrices( a, b ) {

		const ae = a.elements;
		const be = b.elements;
		const te = this.elements;

		const a11 = ae[ 0 ], a12 = ae[ 4 ], a13 = ae[ 8 ], a14 = ae[ 12 ];
		const a21 = ae[ 1 ], a22 = ae[ 5 ], a23 = ae[ 9 ], a24 = ae[ 13 ];
		const a31 = ae[ 2 ], a32 = ae[ 6 ], a33 = ae[ 10 ], a34 = ae[ 14 ];
		const a41 = ae[ 3 ], a42 = ae[ 7 ], a43 = ae[ 11 ], a44 = ae[ 15 ];

		const b11 = be[ 0 ], b12 = be[ 4 ], b13 = be[ 8 ], b14 = be[ 12 ];
		const b21 = be[ 1 ], b22 = be[ 5 ], b23 = be[ 9 ], b24 = be[ 13 ];
		const b31 = be[ 2 ], b32 = be[ 6 ], b33 = be[ 10 ], b34 = be[ 14 ];
		const b41 = be[ 3 ], b42 = be[ 7 ], b43 = be[ 11 ], b44 = be[ 15 ];

		te[ 0 ] = a11 * b11 + a12 * b21 + a13 * b31 + a14 * b41;
		te[ 4 ] = a11 * b12 + a12 * b22 + a13 * b32 + a14 * b42;
		te[ 8 ] = a11 * b13 + a12 * b23 + a13 * b33 + a14 * b43;
		te[ 12 ] = a11 * b14 + a12 * b24 + a13 * b34 + a14 * b44;

		te[ 1 ] = a21 * b11 + a22 * b21 + a23 * b31 + a24 * b41;
		te[ 5 ] = a21 * b12 + a22 * b22 + a23 * b32 + a24 * b42;
		te[ 9 ] = a21 * b13 + a22 * b23 + a23 * b33 + a24 * b43;
		te[ 13 ] = a21 * b14 + a22 * b24 + a23 * b34 + a24 * b44;

		te[ 2 ] = a31 * b11 + a32 * b21 + a33 * b31 + a34 * b41;
		te[ 6 ] = a31 * b12 + a32 * b22 + a33 * b32 + a34 * b42;
		te[ 10 ] = a31 * b13 + a32 * b23 + a33 * b33 + a34 * b43;
		te[ 14 ] = a31 * b14 + a32 * b24 + a33 * b34 + a34 * b44;

		te[ 3 ] = a41 * b11 + a42 * b21 + a43 * b31 + a44 * b41;
		te[ 7 ] = a41 * b12 + a42 * b22 + a43 * b32 + a44 * b42;
		te[ 11 ] = a41 * b13 + a42 * b23 + a43 * b33 + a44 * b43;
		te[ 15 ] = a41 * b14 + a42 * b24 + a43 * b34 + a44 * b44;

		return this;

	}

	multiplyScalar( s ) {

		const te = this.elements;

		te[ 0 ] *= s; te[ 4 ] *= s; te[ 8 ] *= s; te[ 12 ] *= s;
		te[ 1 ] *= s; te[ 5 ] *= s; te[ 9 ] *= s; te[ 13 ] *= s;
		te[ 2 ] *= s; te[ 6 ] *= s; te[ 10 ] *= s; te[ 14 ] *= s;
		te[ 3 ] *= s; te[ 7 ] *= s; te[ 11 ] *= s; te[ 15 ] *= s;

		return this;

	}

	determinant() {

		const te = this.elements;

		const n11 = te[ 0 ], n12 = te[ 4 ], n13 = te[ 8 ], n14 = te[ 12 ];
		const n21 = te[ 1 ], n22 = te[ 5 ], n23 = te[ 9 ], n24 = te[ 13 ];
		const n31 = te[ 2 ], n32 = te[ 6 ], n33 = te[ 10 ], n34 = te[ 14 ];
		const n41 = te[ 3 ], n42 = te[ 7 ], n43 = te[ 11 ], n44 = te[ 15 ];

		//TODO: make this more efficient
		//( based on http://www.euclideanspace.com/maths/algebra/matrix/functions/inverse/fourD/index.htm )

		return (
			n41 * (
				+ n14 * n23 * n32
				 - n13 * n24 * n32
				 - n14 * n22 * n33
				 + n12 * n24 * n33
				 + n13 * n22 * n34
				 - n12 * n23 * n34
			) +
			n42 * (
				+ n11 * n23 * n34
				 - n11 * n24 * n33
				 + n14 * n21 * n33
				 - n13 * n21 * n34
				 + n13 * n24 * n31
				 - n14 * n23 * n31
			) +
			n43 * (
				+ n11 * n24 * n32
				 - n11 * n22 * n34
				 - n14 * n21 * n32
				 + n12 * n21 * n34
				 + n14 * n22 * n31
				 - n12 * n24 * n31
			) +
			n44 * (
				- n13 * n22 * n31
				 - n11 * n23 * n32
				 + n11 * n22 * n33
				 + n13 * n21 * n32
				 - n12 * n21 * n33
				 + n12 * n23 * n31
			)

		);

	}

	transpose() {

		const te = this.elements;
		let tmp;

		tmp = te[ 1 ]; te[ 1 ] = te[ 4 ]; te[ 4 ] = tmp;
		tmp = te[ 2 ]; te[ 2 ] = te[ 8 ]; te[ 8 ] = tmp;
		tmp = te[ 6 ]; te[ 6 ] = te[ 9 ]; te[ 9 ] = tmp;

		tmp = te[ 3 ]; te[ 3 ] = te[ 12 ]; te[ 12 ] = tmp;
		tmp = te[ 7 ]; te[ 7 ] = te[ 13 ]; te[ 13 ] = tmp;
		tmp = te[ 11 ]; te[ 11 ] = te[ 14 ]; te[ 14 ] = tmp;

		return this;

	}

	setPosition( x, y, z ) {

		const te = this.elements;

		if ( x.isVector3 ) {

			te[ 12 ] = x.x;
			te[ 13 ] = x.y;
			te[ 14 ] = x.z;

		} else {

			te[ 12 ] = x;
			te[ 13 ] = y;
			te[ 14 ] = z;

		}

		return this;

	}

	invert() {

		// based on http://www.euclideanspace.com/maths/algebra/matrix/functions/inverse/fourD/index.htm
		const te = this.elements,

			n11 = te[ 0 ], n21 = te[ 1 ], n31 = te[ 2 ], n41 = te[ 3 ],
			n12 = te[ 4 ], n22 = te[ 5 ], n32 = te[ 6 ], n42 = te[ 7 ],
			n13 = te[ 8 ], n23 = te[ 9 ], n33 = te[ 10 ], n43 = te[ 11 ],
			n14 = te[ 12 ], n24 = te[ 13 ], n34 = te[ 14 ], n44 = te[ 15 ],

			t11 = n23 * n34 * n42 - n24 * n33 * n42 + n24 * n32 * n43 - n22 * n34 * n43 - n23 * n32 * n44 + n22 * n33 * n44,
			t12 = n14 * n33 * n42 - n13 * n34 * n42 - n14 * n32 * n43 + n12 * n34 * n43 + n13 * n32 * n44 - n12 * n33 * n44,
			t13 = n13 * n24 * n42 - n14 * n23 * n42 + n14 * n22 * n43 - n12 * n24 * n43 - n13 * n22 * n44 + n12 * n23 * n44,
			t14 = n14 * n23 * n32 - n13 * n24 * n32 - n14 * n22 * n33 + n12 * n24 * n33 + n13 * n22 * n34 - n12 * n23 * n34;

		const det = n11 * t11 + n21 * t12 + n31 * t13 + n41 * t14;

		if ( det === 0 ) return this.set( 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0 );

		const detInv = 1 / det;

		te[ 0 ] = t11 * detInv;
		te[ 1 ] = ( n24 * n33 * n41 - n23 * n34 * n41 - n24 * n31 * n43 + n21 * n34 * n43 + n23 * n31 * n44 - n21 * n33 * n44 ) * detInv;
		te[ 2 ] = ( n22 * n34 * n41 - n24 * n32 * n41 + n24 * n31 * n42 - n21 * n34 * n42 - n22 * n31 * n44 + n21 * n32 * n44 ) * detInv;
		te[ 3 ] = ( n23 * n32 * n41 - n22 * n33 * n41 - n23 * n31 * n42 + n21 * n33 * n42 + n22 * n31 * n43 - n21 * n32 * n43 ) * detInv;

		te[ 4 ] = t12 * detInv;
		te[ 5 ] = ( n13 * n34 * n41 - n14 * n33 * n41 + n14 * n31 * n43 - n11 * n34 * n43 - n13 * n31 * n44 + n11 * n33 * n44 ) * detInv;
		te[ 6 ] = ( n14 * n32 * n41 - n12 * n34 * n41 - n14 * n31 * n42 + n11 * n34 * n42 + n12 * n31 * n44 - n11 * n32 * n44 ) * detInv;
		te[ 7 ] = ( n12 * n33 * n41 - n13 * n32 * n41 + n13 * n31 * n42 - n11 * n33 * n42 - n12 * n31 * n43 + n11 * n32 * n43 ) * detInv;

		te[ 8 ] = t13 * detInv;
		te[ 9 ] = ( n14 * n23 * n41 - n13 * n24 * n41 - n14 * n21 * n43 + n11 * n24 * n43 + n13 * n21 * n44 - n11 * n23 * n44 ) * detInv;
		te[ 10 ] = ( n12 * n24 * n41 - n14 * n22 * n41 + n14 * n21 * n42 - n11 * n24 * n42 - n12 * n21 * n44 + n11 * n22 * n44 ) * detInv;
		te[ 11 ] = ( n13 * n22 * n41 - n12 * n23 * n41 - n13 * n21 * n42 + n11 * n23 * n42 + n12 * n21 * n43 - n11 * n22 * n43 ) * detInv;

		te[ 12 ] = t14 * detInv;
		te[ 13 ] = ( n13 * n24 * n31 - n14 * n23 * n31 + n14 * n21 * n33 - n11 * n24 * n33 - n13 * n21 * n34 + n11 * n23 * n34 ) * detInv;
		te[ 14 ] = ( n14 * n22 * n31 - n12 * n24 * n31 - n14 * n21 * n32 + n11 * n24 * n32 + n12 * n21 * n34 - n11 * n22 * n34 ) * detInv;
		te[ 15 ] = ( n12 * n23 * n31 - n13 * n22 * n31 + n13 * n21 * n32 - n11 * n23 * n32 - n12 * n21 * n33 + n11 * n22 * n33 ) * detInv;

		return this;

	}

	scale( v ) {

		const te = this.elements;
		const x = v.x, y = v.y, z = v.z;

		te[ 0 ] *= x; te[ 4 ] *= y; te[ 8 ] *= z;
		te[ 1 ] *= x; te[ 5 ] *= y; te[ 9 ] *= z;
		te[ 2 ] *= x; te[ 6 ] *= y; te[ 10 ] *= z;
		te[ 3 ] *= x; te[ 7 ] *= y; te[ 11 ] *= z;

		return this;

	}

	getMaxScaleOnAxis() {

		const te = this.elements;

		const scaleXSq = te[ 0 ] * te[ 0 ] + te[ 1 ] * te[ 1 ] + te[ 2 ] * te[ 2 ];
		const scaleYSq = te[ 4 ] * te[ 4 ] + te[ 5 ] * te[ 5 ] + te[ 6 ] * te[ 6 ];
		const scaleZSq = te[ 8 ] * te[ 8 ] + te[ 9 ] * te[ 9 ] + te[ 10 ] * te[ 10 ];

		return Math.sqrt( Math.max( scaleXSq, scaleYSq, scaleZSq ) );

	}

	makeTranslation( x, y, z ) {

		this.set(

			1, 0, 0, x,
			0, 1, 0, y,
			0, 0, 1, z,
			0, 0, 0, 1

		);

		return this;

	}

	makeRotationX( theta ) {

		const c = Math.cos( theta ), s = Math.sin( theta );

		this.set(

			1, 0, 0, 0,
			0, c, - s, 0,
			0, s, c, 0,
			0, 0, 0, 1

		);

		return this;

	}

	makeRotationY( theta ) {

		const c = Math.cos( theta ), s = Math.sin( theta );

		this.set(

			 c, 0, s, 0,
			 0, 1, 0, 0,
			- s, 0, c, 0,
			 0, 0, 0, 1

		);

		return this;

	}

	makeRotationZ( theta ) {

		const c = Math.cos( theta ), s = Math.sin( theta );

		this.set(

			c, - s, 0, 0,
			s, c, 0, 0,
			0, 0, 1, 0,
			0, 0, 0, 1

		);

		return this;

	}

	makeRotationAxis( axis, angle ) {

		// Based on http://www.gamedev.net/reference/articles/article1199.asp

		const c = Math.cos( angle );
		const s = Math.sin( angle );
		const t = 1 - c;
		const x = axis.x, y = axis.y, z = axis.z;
		const tx = t * x, ty = t * y;

		this.set(

			tx * x + c, tx * y - s * z, tx * z + s * y, 0,
			tx * y + s * z, ty * y + c, ty * z - s * x, 0,
			tx * z - s * y, ty * z + s * x, t * z * z + c, 0,
			0, 0, 0, 1

		);

		return this;

	}

	makeScale( x, y, z ) {

		this.set(

			x, 0, 0, 0,
			0, y, 0, 0,
			0, 0, z, 0,
			0, 0, 0, 1

		);

		return this;

	}

	makeShear( xy, xz, yx, yz, zx, zy ) {

		this.set(

			1, yx, zx, 0,
			xy, 1, zy, 0,
			xz, yz, 1, 0,
			0, 0, 0, 1

		);

		return this;

	}

	compose( position, quaternion, scale ) {

		const te = this.elements;

		const x = quaternion._x, y = quaternion._y, z = quaternion._z, w = quaternion._w;
		const x2 = x + x,	y2 = y + y, z2 = z + z;
		const xx = x * x2, xy = x * y2, xz = x * z2;
		const yy = y * y2, yz = y * z2, zz = z * z2;
		const wx = w * x2, wy = w * y2, wz = w * z2;

		const sx = scale.x, sy = scale.y, sz = scale.z;

		te[ 0 ] = ( 1 - ( yy + zz ) ) * sx;
		te[ 1 ] = ( xy + wz ) * sx;
		te[ 2 ] = ( xz - wy ) * sx;
		te[ 3 ] = 0;

		te[ 4 ] = ( xy - wz ) * sy;
		te[ 5 ] = ( 1 - ( xx + zz ) ) * sy;
		te[ 6 ] = ( yz + wx ) * sy;
		te[ 7 ] = 0;

		te[ 8 ] = ( xz + wy ) * sz;
		te[ 9 ] = ( yz - wx ) * sz;
		te[ 10 ] = ( 1 - ( xx + yy ) ) * sz;
		te[ 11 ] = 0;

		te[ 12 ] = position.x;
		te[ 13 ] = position.y;
		te[ 14 ] = position.z;
		te[ 15 ] = 1;

		return this;

	}

	decompose( position, quaternion, scale ) {

		const te = this.elements;

		let sx = _v1.set( te[ 0 ], te[ 1 ], te[ 2 ] ).length();
		const sy = _v1.set( te[ 4 ], te[ 5 ], te[ 6 ] ).length();
		const sz = _v1.set( te[ 8 ], te[ 9 ], te[ 10 ] ).length();

		// if determine is negative, we need to invert one scale
		const det = this.determinant();
		if ( det < 0 ) sx = - sx;

		position.x = te[ 12 ];
		position.y = te[ 13 ];
		position.z = te[ 14 ];

		// scale the rotation part
		_m1.copy( this );

		const invSX = 1 / sx;
		const invSY = 1 / sy;
		const invSZ = 1 / sz;

		_m1.elements[ 0 ] *= invSX;
		_m1.elements[ 1 ] *= invSX;
		_m1.elements[ 2 ] *= invSX;

		_m1.elements[ 4 ] *= invSY;
		_m1.elements[ 5 ] *= invSY;
		_m1.elements[ 6 ] *= invSY;

		_m1.elements[ 8 ] *= invSZ;
		_m1.elements[ 9 ] *= invSZ;
		_m1.elements[ 10 ] *= invSZ;

		quaternion.setFromRotationMatrix( _m1 );

		scale.x = sx;
		scale.y = sy;
		scale.z = sz;

		return this;

	}

	makePerspective( left, right, top, bottom, near, far ) {

		const te = this.elements;
		const x = 2 * near / ( right - left );
		const y = 2 * near / ( top - bottom );

		const a = ( right + left ) / ( right - left );
		const b = ( top + bottom ) / ( top - bottom );
		const c = - ( far + near ) / ( far - near );
		const d = - 2 * far * near / ( far - near );

		te[ 0 ] = x;	te[ 4 ] = 0;	te[ 8 ] = a;	te[ 12 ] = 0;
		te[ 1 ] = 0;	te[ 5 ] = y;	te[ 9 ] = b;	te[ 13 ] = 0;
		te[ 2 ] = 0;	te[ 6 ] = 0;	te[ 10 ] = c;	te[ 14 ] = d;
		te[ 3 ] = 0;	te[ 7 ] = 0;	te[ 11 ] = - 1;	te[ 15 ] = 0;

		return this;

	}

	makeOrthographic( left, right, top, bottom, near, far ) {

		const te = this.elements;
		const w = 1.0 / ( right - left );
		const h = 1.0 / ( top - bottom );
		const p = 1.0 / ( far - near );

		const x = ( right + left ) * w;
		const y = ( top + bottom ) * h;
		const z = ( far + near ) * p;

		te[ 0 ] = 2 * w;	te[ 4 ] = 0;	te[ 8 ] = 0;	te[ 12 ] = - x;
		te[ 1 ] = 0;	te[ 5 ] = 2 * h;	te[ 9 ] = 0;	te[ 13 ] = - y;
		te[ 2 ] = 0;	te[ 6 ] = 0;	te[ 10 ] = - 2 * p;	te[ 14 ] = - z;
		te[ 3 ] = 0;	te[ 7 ] = 0;	te[ 11 ] = 0;	te[ 15 ] = 1;

		return this;

	}

	equals( matrix ) {

		const te = this.elements;
		const me = matrix.elements;

		for ( let i = 0; i < 16; i ++ ) {

			if ( te[ i ] !== me[ i ] ) return false;

		}

		return true;

	}

	fromArray( array, offset = 0 ) {

		for ( let i = 0; i < 16; i ++ ) {

			this.elements[ i ] = array[ i + offset ];

		}

		return this;

	}

	toArray( array = [], offset = 0 ) {

		const te = this.elements;

		array[ offset ] = te[ 0 ];
		array[ offset + 1 ] = te[ 1 ];
		array[ offset + 2 ] = te[ 2 ];
		array[ offset + 3 ] = te[ 3 ];

		array[ offset + 4 ] = te[ 4 ];
		array[ offset + 5 ] = te[ 5 ];
		array[ offset + 6 ] = te[ 6 ];
		array[ offset + 7 ] = te[ 7 ];

		array[ offset + 8 ] = te[ 8 ];
		array[ offset + 9 ] = te[ 9 ];
		array[ offset + 10 ] = te[ 10 ];
		array[ offset + 11 ] = te[ 11 ];

		array[ offset + 12 ] = te[ 12 ];
		array[ offset + 13 ] = te[ 13 ];
		array[ offset + 14 ] = te[ 14 ];
		array[ offset + 15 ] = te[ 15 ];

		return array;

	}

}

const _v1 = /*@__PURE__*/ new Vector3();
const _m1 = /*@__PURE__*/ new Matrix4();
const _zero = /*@__PURE__*/ new Vector3( 0, 0, 0 );
const _one = /*@__PURE__*/ new Vector3( 1, 1, 1 );
const _x = /*@__PURE__*/ new Vector3();
const _y = /*@__PURE__*/ new Vector3();
const _z = /*@__PURE__*/ new Vector3();

/**
 * Extensible curve object.
 *
 * Some common of curve methods:
 * .getPoint( t, optionalTarget ), .getTangent( t, optionalTarget )
 * .getPointAt( u, optionalTarget ), .getTangentAt( u, optionalTarget )
 * .getPoints(), .getSpacedPoints()
 * .getLength()
 * .updateArcLengths()
 *
 * This following curves inherit from THREE.Curve:
 *
 * -- 2D curves --
 * THREE.ArcCurve
 * THREE.CubicBezierCurve
 * THREE.EllipseCurve
 * THREE.LineCurve
 * THREE.QuadraticBezierCurve
 * THREE.SplineCurve
 *
 * -- 3D curves --
 * THREE.CatmullRomCurve3
 * THREE.CubicBezierCurve3
 * THREE.LineCurve3
 * THREE.QuadraticBezierCurve3
 *
 * A series of curves can be represented as a THREE.CurvePath.
 * @private
 *
 **/

class Curve {
    constructor() {
        this.type = "Curve";

        this.arcLengthDivisions = 200;
    }

    // Virtual base class method to overwrite and implement in subclasses
    //	- t [0 .. 1]

    getPoint(/* t, optionalTarget */) {
        console.warn("THREE.Curve: .getPoint() not implemented.");
        return null;
    }

    // Get point at relative position in curve according to arc length
    // - u [0 .. 1]

    getPointAt(u, optionalTarget) {
        const t = this.getUtoTmapping(u);
        return this.getPoint(t, optionalTarget);
    }

    // Get sequence of points using getPoint( t )

    getPoints(divisions = 5) {
        const points = [];

        for (let d = 0; d <= divisions; d++) {
            points.push(this.getPoint(d / divisions));
        }

        return points;
    }

    // Get sequence of points using getPointAt( u )

    getSpacedPoints(divisions = 5) {
        const points = [];

        for (let d = 0; d <= divisions; d++) {
            points.push(this.getPointAt(d / divisions));
        }

        return points;
    }

    // Get total curve arc length

    getLength() {
        const lengths = this.getLengths();
        return lengths[lengths.length - 1];
    }

    // Get list of cumulative segment lengths

    getLengths(divisions = this.arcLengthDivisions) {
        if (
            this.cacheArcLengths &&
            this.cacheArcLengths.length === divisions + 1 &&
            !this.needsUpdate
        ) {
            return this.cacheArcLengths;
        }

        this.needsUpdate = false;

        const cache = [];
        let current,
            last = this.getPoint(0);
        let sum = 0;

        cache.push(0);

        for (let p = 1; p <= divisions; p++) {
            current = this.getPoint(p / divisions);
            sum += current.distanceTo(last);
            cache.push(sum);
            last = current;
        }

        this.cacheArcLengths = cache;

        return cache; // { sums: cache, sum: sum }; Sum is in the last element.
    }

    updateArcLengths() {
        this.needsUpdate = true;
        this.getLengths();
    }

    // Given u ( 0 .. 1 ), get a t to find p. This gives you points which are equidistant

    getUtoTmapping(u, distance) {
        const arcLengths = this.getLengths();

        let i = 0;
        const il = arcLengths.length;

        let targetArcLength; // The targeted u distance value to get

        if (distance) {
            targetArcLength = distance;
        } else {
            targetArcLength = u * arcLengths[il - 1];
        }

        // binary search for the index with largest value smaller than target u distance

        let low = 0,
            high = il - 1,
            comparison;

        while (low <= high) {
            i = Math.floor(low + (high - low) / 2); // less likely to overflow, though probably not issue here, JS doesn't really have integers, all numbers are floats

            comparison = arcLengths[i] - targetArcLength;

            if (comparison < 0) {
                low = i + 1;
            } else if (comparison > 0) {
                high = i - 1;
            } else {
                high = i;
                break;

                // DONE
            }
        }

        i = high;

        if (arcLengths[i] === targetArcLength) {
            return i / (il - 1);
        }

        // we could get finer grain at lengths, or use simple interpolation between two points

        const lengthBefore = arcLengths[i];
        const lengthAfter = arcLengths[i + 1];

        const segmentLength = lengthAfter - lengthBefore;

        // determine where we are between the 'before' and 'after' points

        const segmentFraction =
            (targetArcLength - lengthBefore) / segmentLength;

        // add that fractional amount to t

        const t = (i + segmentFraction) / (il - 1);

        return t;
    }

    // Returns a unit vector tangent at t
    // In case any sub curve does not implement its tangent derivation,
    // 2 points a small delta apart will be used to find its gradient
    // which seems to give a reasonable approximation

    getTangent(t, optionalTarget) {
        const delta = 0.0001;
        let t1 = t - delta;
        let t2 = t + delta;

        // Capping in case of danger

        if (t1 < 0) t1 = 0;
        if (t2 > 1) t2 = 1;

        const pt1 = this.getPoint(t1);
        const pt2 = this.getPoint(t2);

        const tangent =
            optionalTarget || (pt1.isVector2 ? new Vector2() : new Vector3());

        tangent.copy(pt2).sub(pt1).normalize();

        return tangent;
    }

    getTangentAt(u, optionalTarget) {
        const t = this.getUtoTmapping(u);
        return this.getTangent(t, optionalTarget);
    }

    computeFrenetFrames(segments, closed) {
        // see http://www.cs.indiana.edu/pub/techreports/TR425.pdf

        const normal = new Vector3();

        const tangents = [];
        const normals = [];
        const binormals = [];

        const vec = new Vector3();
        const mat = new Matrix4();

        // compute the tangent vectors for each segment on the curve

        for (let i = 0; i <= segments; i++) {
            const u = i / segments;

            tangents[i] = this.getTangentAt(u, new Vector3());
        }

        // select an initial normal vector perpendicular to the first tangent vector,
        // and in the direction of the minimum tangent xyz component

        normals[0] = new Vector3();
        binormals[0] = new Vector3();
        let min = Number.MAX_VALUE;
        const tx = Math.abs(tangents[0].x);
        const ty = Math.abs(tangents[0].y);
        const tz = Math.abs(tangents[0].z);

        if (tx <= min) {
            min = tx;
            normal.set(1, 0, 0);
        }

        if (ty <= min) {
            min = ty;
            normal.set(0, 1, 0);
        }

        if (tz <= min) {
            normal.set(0, 0, 1);
        }

        vec.crossVectors(tangents[0], normal).normalize();

        normals[0].crossVectors(tangents[0], vec);
        binormals[0].crossVectors(tangents[0], normals[0]);

        // compute the slowly-varying normal and binormal vectors for each segment on the curve

        for (let i = 1; i <= segments; i++) {
            normals[i] = normals[i - 1].clone();

            binormals[i] = binormals[i - 1].clone();

            vec.crossVectors(tangents[i - 1], tangents[i]);

            if (vec.length() > Number.EPSILON) {
                vec.normalize();

                const theta = Math.acos(
                    clamp(tangents[i - 1].dot(tangents[i]), -1, 1)
                ); // clamp for floating pt errors

                normals[i].applyMatrix4(mat.makeRotationAxis(vec, theta));
            }

            binormals[i].crossVectors(tangents[i], normals[i]);
        }

        // if the curve is closed, postprocess the vectors so the first and last normal vectors are the same

        if (closed === true) {
            let theta = Math.acos(
                clamp(normals[0].dot(normals[segments]), -1, 1)
            );
            theta /= segments;

            if (
                tangents[0].dot(
                    vec.crossVectors(normals[0], normals[segments])
                ) > 0
            ) {
                theta = -theta;
            }

            for (let i = 1; i <= segments; i++) {
                // twist a little...
                normals[i].applyMatrix4(
                    mat.makeRotationAxis(tangents[i], theta * i)
                );
                binormals[i].crossVectors(tangents[i], normals[i]);
            }
        }

        return {
            tangents: tangents,
            normals: normals,
            binormals: binormals,
        };
    }

    clone() {
        return new this.constructor().copy(this);
    }

    copy(source) {
        this.arcLengthDivisions = source.arcLengthDivisions;

        return this;
    }

    toJSON() {
        const data = {
            metadata: {
                version: 4.5,
                type: "Curve",
                generator: "Curve.toJSON",
            },
        };

        data.arcLengthDivisions = this.arcLengthDivisions;
        data.type = this.type;

        return data;
    }

    fromJSON(json) {
        this.arcLengthDivisions = json.arcLengthDivisions;

        return this;
    }
}

class EllipseCurve extends Curve {
    constructor(
        aX = 0,
        aY = 0,
        xRadius = 1,
        yRadius = 1,
        aStartAngle = 0,
        aEndAngle = Math.PI * 2,
        aClockwise = false,
        aRotation = 0
    ) {
        super();

        this.isEllipseCurve = true;

        this.type = "EllipseCurve";

        this.aX = aX;
        this.aY = aY;

        this.xRadius = xRadius;
        this.yRadius = yRadius;

        this.aStartAngle = aStartAngle;
        this.aEndAngle = aEndAngle;

        this.aClockwise = aClockwise;

        this.aRotation = aRotation;
    }

    getPoint(t, optionalTarget) {
        const point = optionalTarget || new Vector2();

        const twoPi = Math.PI * 2;
        let deltaAngle = this.aEndAngle - this.aStartAngle;
        const samePoints = Math.abs(deltaAngle) < Number.EPSILON;

        // ensures that deltaAngle is 0 .. 2 PI
        while (deltaAngle < 0) deltaAngle += twoPi;
        while (deltaAngle > twoPi) deltaAngle -= twoPi;

        if (deltaAngle < Number.EPSILON) {
            if (samePoints) {
                deltaAngle = 0;
            } else {
                deltaAngle = twoPi;
            }
        }

        if (this.aClockwise === true && !samePoints) {
            if (deltaAngle === twoPi) {
                deltaAngle = -twoPi;
            } else {
                deltaAngle = deltaAngle - twoPi;
            }
        }

        const angle = this.aStartAngle + t * deltaAngle;
        let x = this.aX + this.xRadius * Math.cos(angle);
        let y = this.aY + this.yRadius * Math.sin(angle);

        if (this.aRotation !== 0) {
            const cos = Math.cos(this.aRotation);
            const sin = Math.sin(this.aRotation);

            const tx = x - this.aX;
            const ty = y - this.aY;

            // Rotate the point about the center of the ellipse.
            x = tx * cos - ty * sin + this.aX;
            y = tx * sin + ty * cos + this.aY;
        }

        return point.set(x, y);
    }

    copy(source) {
        super.copy(source);

        this.aX = source.aX;
        this.aY = source.aY;

        this.xRadius = source.xRadius;
        this.yRadius = source.yRadius;

        this.aStartAngle = source.aStartAngle;
        this.aEndAngle = source.aEndAngle;

        this.aClockwise = source.aClockwise;

        this.aRotation = source.aRotation;

        return this;
    }

    toJSON() {
        const data = super.toJSON();

        data.aX = this.aX;
        data.aY = this.aY;

        data.xRadius = this.xRadius;
        data.yRadius = this.yRadius;

        data.aStartAngle = this.aStartAngle;
        data.aEndAngle = this.aEndAngle;

        data.aClockwise = this.aClockwise;

        data.aRotation = this.aRotation;

        return data;
    }

    fromJSON(json) {
        super.fromJSON(json);

        this.aX = json.aX;
        this.aY = json.aY;

        this.xRadius = json.xRadius;
        this.yRadius = json.yRadius;

        this.aStartAngle = json.aStartAngle;
        this.aEndAngle = json.aEndAngle;

        this.aClockwise = json.aClockwise;

        this.aRotation = json.aRotation;

        return this;
    }
}

class ArcCurve extends EllipseCurve {

	constructor( aX, aY, aRadius, aStartAngle, aEndAngle, aClockwise ) {

		super( aX, aY, aRadius, aRadius, aStartAngle, aEndAngle, aClockwise );

		this.isArcCurve = true;

		this.type = 'ArcCurve';

	}

}

/**
 * Centripetal CatmullRom Curve - which is useful for avoiding
 * cusps and self-intersections in non-uniform catmull rom curves.
 * http://www.cemyuksel.com/research/catmullrom_param/catmullrom.pdf
 *
 * curve.type accepts centripetal(default), chordal and catmullrom
 * curve.tension is used for catmullrom which defaults to 0.5
 */

/*
Based on an optimized c++ solution in
 - http://stackoverflow.com/questions/9489736/catmull-rom-curve-with-no-cusps-and-no-self-intersections/
 - http://ideone.com/NoEbVM

This CubicPoly class could be used for reusing some variables and calculations,
but for three.js curve use, it could be possible inlined and flatten into a single function call
which can be placed in CurveUtils.
*/

function CubicPoly() {
    let c0 = 0,
        c1 = 0,
        c2 = 0,
        c3 = 0;

    /*
     * Compute coefficients for a cubic polynomial
     *   p(s) = c0 + c1*s + c2*s^2 + c3*s^3
     * such that
     *   p(0) = x0, p(1) = x1
     *  and
     *   p'(0) = t0, p'(1) = t1.
     */
    function init(x0, x1, t0, t1) {
        c0 = x0;
        c1 = t0;
        c2 = -3 * x0 + 3 * x1 - 2 * t0 - t1;
        c3 = 2 * x0 - 2 * x1 + t0 + t1;
    }

    return {
        initCatmullRom: function (x0, x1, x2, x3, tension) {
            init(x1, x2, tension * (x2 - x0), tension * (x3 - x1));
        },

        initNonuniformCatmullRom: function (x0, x1, x2, x3, dt0, dt1, dt2) {
            // compute tangents when parameterized in [t1,t2]
            let t1 =
                (x1 - x0) / dt0 - (x2 - x0) / (dt0 + dt1) + (x2 - x1) / dt1;
            let t2 =
                (x2 - x1) / dt1 - (x3 - x1) / (dt1 + dt2) + (x3 - x2) / dt2;

            // rescale tangents for parametrization in [0,1]
            t1 *= dt1;
            t2 *= dt1;

            init(x1, x2, t1, t2);
        },

        calc: function (t) {
            const t2 = t * t;
            const t3 = t2 * t;
            return c0 + c1 * t + c2 * t2 + c3 * t3;
        },
    };
}

//

const tmp = /*@__PURE__*/ new Vector3();
const px = /*@__PURE__*/ new CubicPoly();
const py = /*@__PURE__*/ new CubicPoly();
const pz = /*@__PURE__*/ new CubicPoly();

class CatmullRomCurve3 extends Curve {
    constructor(
        points = [],
        closed = false,
        curveType = "centripetal",
        tension = 0.5
    ) {
        super();

        this.isCatmullRomCurve3 = true;

        this.type = "CatmullRomCurve3";

        this.points = points;
        this.closed = closed;
        this.curveType = curveType;
        this.tension = tension;
    }

    getPoint(t, optionalTarget = new Vector3()) {
        const point = optionalTarget;

        const points = this.points;
        const l = points.length;

        const p = (l - (this.closed ? 0 : 1)) * t;
        let intPoint = Math.floor(p);
        let weight = p - intPoint;

        if (this.closed) {
            intPoint +=
                intPoint > 0 ? 0 : (Math.floor(Math.abs(intPoint) / l) + 1) * l;
        } else if (weight === 0 && intPoint === l - 1) {
            intPoint = l - 2;
            weight = 1;
        }

        let p0, p3; // 4 points (p1 & p2 defined below)

        if (this.closed || intPoint > 0) {
            p0 = points[(intPoint - 1) % l];
        } else {
            // extrapolate first point
            tmp.subVectors(points[0], points[1]).add(points[0]);
            p0 = tmp;
        }

        const p1 = points[intPoint % l];
        const p2 = points[(intPoint + 1) % l];

        if (this.closed || intPoint + 2 < l) {
            p3 = points[(intPoint + 2) % l];
        } else {
            // extrapolate last point
            tmp.subVectors(points[l - 1], points[l - 2]).add(points[l - 1]);
            p3 = tmp;
        }

        if (this.curveType === "centripetal" || this.curveType === "chordal") {
            // init Centripetal / Chordal Catmull-Rom
            const pow = this.curveType === "chordal" ? 0.5 : 0.25;
            let dt0 = Math.pow(p0.distanceToSquared(p1), pow);
            let dt1 = Math.pow(p1.distanceToSquared(p2), pow);
            let dt2 = Math.pow(p2.distanceToSquared(p3), pow);

            // safety check for repeated points
            if (dt1 < 1e-4) dt1 = 1.0;
            if (dt0 < 1e-4) dt0 = dt1;
            if (dt2 < 1e-4) dt2 = dt1;

            px.initNonuniformCatmullRom(p0.x, p1.x, p2.x, p3.x, dt0, dt1, dt2);
            py.initNonuniformCatmullRom(p0.y, p1.y, p2.y, p3.y, dt0, dt1, dt2);
            pz.initNonuniformCatmullRom(p0.z, p1.z, p2.z, p3.z, dt0, dt1, dt2);
        } else if (this.curveType === "catmullrom") {
            px.initCatmullRom(p0.x, p1.x, p2.x, p3.x, this.tension);
            py.initCatmullRom(p0.y, p1.y, p2.y, p3.y, this.tension);
            pz.initCatmullRom(p0.z, p1.z, p2.z, p3.z, this.tension);
        }

        point.set(px.calc(weight), py.calc(weight), pz.calc(weight));

        return point;
    }

    copy(source) {
        super.copy(source);

        this.points = [];

        for (let i = 0, l = source.points.length; i < l; i++) {
            const point = source.points[i];

            this.points.push(point.clone());
        }

        this.closed = source.closed;
        this.curveType = source.curveType;
        this.tension = source.tension;

        return this;
    }

    toJSON() {
        const data = super.toJSON();

        data.points = [];

        for (let i = 0, l = this.points.length; i < l; i++) {
            const point = this.points[i];
            data.points.push(point.toArray());
        }

        data.closed = this.closed;
        data.curveType = this.curveType;
        data.tension = this.tension;

        return data;
    }

    fromJSON(json) {
        super.fromJSON(json);

        this.points = [];

        for (let i = 0, l = json.points.length; i < l; i++) {
            const point = json.points[i];
            this.points.push(new Vector3().fromArray(point));
        }

        this.closed = json.closed;
        this.curveType = json.curveType;
        this.tension = json.tension;

        return this;
    }
}

/**
 * Bezier Curves formulas obtained from
 * https://en.wikipedia.org/wiki/B%C3%A9zier_curve
 * @private
 */

function CatmullRom(t, p0, p1, p2, p3) {
    const v0 = (p2 - p0) * 0.5;
    const v1 = (p3 - p1) * 0.5;
    const t2 = t * t;
    const t3 = t * t2;
    return (
        (2 * p1 - 2 * p2 + v0 + v1) * t3 +
        (-3 * p1 + 3 * p2 - 2 * v0 - v1) * t2 +
        v0 * t +
        p1
    );
}

//

function QuadraticBezierP0(t, p) {
    const k = 1 - t;
    return k * k * p;
}

function QuadraticBezierP1(t, p) {
    return 2 * (1 - t) * t * p;
}

function QuadraticBezierP2(t, p) {
    return t * t * p;
}

function QuadraticBezier(t, p0, p1, p2) {
    return (
        QuadraticBezierP0(t, p0) +
        QuadraticBezierP1(t, p1) +
        QuadraticBezierP2(t, p2)
    );
}

//

function CubicBezierP0(t, p) {
    const k = 1 - t;
    return k * k * k * p;
}

function CubicBezierP1(t, p) {
    const k = 1 - t;
    return 3 * k * k * t * p;
}

function CubicBezierP2(t, p) {
    return 3 * (1 - t) * t * t * p;
}

function CubicBezierP3(t, p) {
    return t * t * t * p;
}

function CubicBezier(t, p0, p1, p2, p3) {
    return (
        CubicBezierP0(t, p0) +
        CubicBezierP1(t, p1) +
        CubicBezierP2(t, p2) +
        CubicBezierP3(t, p3)
    );
}

class CubicBezierCurve extends Curve {
    constructor(
        v0 = new Vector2(),
        v1 = new Vector2(),
        v2 = new Vector2(),
        v3 = new Vector2()
    ) {
        super();

        this.isCubicBezierCurve = true;

        this.type = "CubicBezierCurve";

        this.v0 = v0;
        this.v1 = v1;
        this.v2 = v2;
        this.v3 = v3;
    }

    getPoint(t, optionalTarget = new Vector2()) {
        const point = optionalTarget;

        const v0 = this.v0,
            v1 = this.v1,
            v2 = this.v2,
            v3 = this.v3;

        point.set(
            CubicBezier(t, v0.x, v1.x, v2.x, v3.x),
            CubicBezier(t, v0.y, v1.y, v2.y, v3.y)
        );

        return point;
    }

    copy(source) {
        super.copy(source);

        this.v0.copy(source.v0);
        this.v1.copy(source.v1);
        this.v2.copy(source.v2);
        this.v3.copy(source.v3);

        return this;
    }

    toJSON() {
        const data = super.toJSON();

        data.v0 = this.v0.toArray();
        data.v1 = this.v1.toArray();
        data.v2 = this.v2.toArray();
        data.v3 = this.v3.toArray();

        return data;
    }

    fromJSON(json) {
        super.fromJSON(json);

        this.v0.fromArray(json.v0);
        this.v1.fromArray(json.v1);
        this.v2.fromArray(json.v2);
        this.v3.fromArray(json.v3);

        return this;
    }
}

class CubicBezierCurve3 extends Curve {
    constructor(
        v0 = new Vector3(),
        v1 = new Vector3(),
        v2 = new Vector3(),
        v3 = new Vector3()
    ) {
        super();

        this.isCubicBezierCurve3 = true;

        this.type = "CubicBezierCurve3";

        this.v0 = v0;
        this.v1 = v1;
        this.v2 = v2;
        this.v3 = v3;
    }

    getPoint(t, optionalTarget = new Vector3()) {
        const point = optionalTarget;

        const v0 = this.v0,
            v1 = this.v1,
            v2 = this.v2,
            v3 = this.v3;

        point.set(
            CubicBezier(t, v0.x, v1.x, v2.x, v3.x),
            CubicBezier(t, v0.y, v1.y, v2.y, v3.y),
            CubicBezier(t, v0.z, v1.z, v2.z, v3.z)
        );

        return point;
    }

    copy(source) {
        super.copy(source);

        this.v0.copy(source.v0);
        this.v1.copy(source.v1);
        this.v2.copy(source.v2);
        this.v3.copy(source.v3);

        return this;
    }

    toJSON() {
        const data = super.toJSON();

        data.v0 = this.v0.toArray();
        data.v1 = this.v1.toArray();
        data.v2 = this.v2.toArray();
        data.v3 = this.v3.toArray();

        return data;
    }

    fromJSON(json) {
        super.fromJSON(json);

        this.v0.fromArray(json.v0);
        this.v1.fromArray(json.v1);
        this.v2.fromArray(json.v2);
        this.v3.fromArray(json.v3);

        return this;
    }
}

class LineCurve extends Curve {
    constructor(v1 = new Vector2(), v2 = new Vector2()) {
        super();

        this.isLineCurve = true;

        this.type = "LineCurve";

        this.v1 = v1;
        this.v2 = v2;
    }

    getPoint(t, optionalTarget = new Vector2()) {
        const point = optionalTarget;

        if (t === 1) {
            point.copy(this.v2);
        } else {
            point.copy(this.v2).sub(this.v1);
            point.multiplyScalar(t).add(this.v1);
        }

        return point;
    }

    // Line curve is linear, so we can overwrite default getPointAt
    getPointAt(u, optionalTarget) {
        return this.getPoint(u, optionalTarget);
    }

    getTangent(t, optionalTarget) {
        const tangent = optionalTarget || new Vector2();

        tangent.copy(this.v2).sub(this.v1).normalize();

        return tangent;
    }

    copy(source) {
        super.copy(source);

        this.v1.copy(source.v1);
        this.v2.copy(source.v2);

        return this;
    }

    toJSON() {
        const data = super.toJSON();

        data.v1 = this.v1.toArray();
        data.v2 = this.v2.toArray();

        return data;
    }

    fromJSON(json) {
        super.fromJSON(json);

        this.v1.fromArray(json.v1);
        this.v2.fromArray(json.v2);

        return this;
    }
}

class LineCurve3 extends Curve {
    constructor(v1 = new Vector3(), v2 = new Vector3()) {
        super();

        this.isLineCurve3 = true;

        this.type = "LineCurve3";

        this.v1 = v1;
        this.v2 = v2;
    }
    getPoint(t, optionalTarget = new Vector3()) {
        const point = optionalTarget;

        if (t === 1) {
            point.copy(this.v2);
        } else {
            point.copy(this.v2).sub(this.v1);
            point.multiplyScalar(t).add(this.v1);
        }

        return point;
    }
    // Line curve is linear, so we can overwrite default getPointAt
    getPointAt(u, optionalTarget) {
        return this.getPoint(u, optionalTarget);
    }
    copy(source) {
        super.copy(source);

        this.v1.copy(source.v1);
        this.v2.copy(source.v2);

        return this;
    }
    toJSON() {
        const data = super.toJSON();

        data.v1 = this.v1.toArray();
        data.v2 = this.v2.toArray();

        return data;
    }
    fromJSON(json) {
        super.fromJSON(json);

        this.v1.fromArray(json.v1);
        this.v2.fromArray(json.v2);

        return this;
    }
}

class QuadraticBezierCurve extends Curve {
    constructor(v0 = new Vector2(), v1 = new Vector2(), v2 = new Vector2()) {
        super();

        this.isQuadraticBezierCurve = true;

        this.type = "QuadraticBezierCurve";

        this.v0 = v0;
        this.v1 = v1;
        this.v2 = v2;
    }

    getPoint(t, optionalTarget = new Vector2()) {
        const point = optionalTarget;

        const v0 = this.v0,
            v1 = this.v1,
            v2 = this.v2;

        point.set(
            QuadraticBezier(t, v0.x, v1.x, v2.x),
            QuadraticBezier(t, v0.y, v1.y, v2.y)
        );

        return point;
    }

    copy(source) {
        super.copy(source);

        this.v0.copy(source.v0);
        this.v1.copy(source.v1);
        this.v2.copy(source.v2);

        return this;
    }

    toJSON() {
        const data = super.toJSON();

        data.v0 = this.v0.toArray();
        data.v1 = this.v1.toArray();
        data.v2 = this.v2.toArray();

        return data;
    }

    fromJSON(json) {
        super.fromJSON(json);

        this.v0.fromArray(json.v0);
        this.v1.fromArray(json.v1);
        this.v2.fromArray(json.v2);

        return this;
    }
}

class QuadraticBezierCurve3 extends Curve {
    constructor(v0 = new Vector3(), v1 = new Vector3(), v2 = new Vector3()) {
        super();

        this.isQuadraticBezierCurve3 = true;

        this.type = "QuadraticBezierCurve3";

        this.v0 = v0;
        this.v1 = v1;
        this.v2 = v2;
    }

    getPoint(t, optionalTarget = new Vector3()) {
        const point = optionalTarget;

        const v0 = this.v0,
            v1 = this.v1,
            v2 = this.v2;

        point.set(
            QuadraticBezier(t, v0.x, v1.x, v2.x),
            QuadraticBezier(t, v0.y, v1.y, v2.y),
            QuadraticBezier(t, v0.z, v1.z, v2.z)
        );

        return point;
    }

    copy(source) {
        super.copy(source);

        this.v0.copy(source.v0);
        this.v1.copy(source.v1);
        this.v2.copy(source.v2);

        return this;
    }

    toJSON() {
        const data = super.toJSON();

        data.v0 = this.v0.toArray();
        data.v1 = this.v1.toArray();
        data.v2 = this.v2.toArray();

        return data;
    }

    fromJSON(json) {
        super.fromJSON(json);

        this.v0.fromArray(json.v0);
        this.v1.fromArray(json.v1);
        this.v2.fromArray(json.v2);

        return this;
    }
}

class SplineCurve extends Curve {
    constructor(points = []) {
        super();

        this.isSplineCurve = true;

        this.type = "SplineCurve";

        this.points = points;
    }

    getPoint(t, optionalTarget = new Vector2()) {
        const point = optionalTarget;

        const points = this.points;
        const p = (points.length - 1) * t;

        const intPoint = Math.floor(p);
        const weight = p - intPoint;

        const p0 = points[intPoint === 0 ? intPoint : intPoint - 1];
        const p1 = points[intPoint];
        const p2 =
            points[
                intPoint > points.length - 2 ? points.length - 1 : intPoint + 1
            ];
        const p3 =
            points[
                intPoint > points.length - 3 ? points.length - 1 : intPoint + 2
            ];

        point.set(
            CatmullRom(weight, p0.x, p1.x, p2.x, p3.x),
            CatmullRom(weight, p0.y, p1.y, p2.y, p3.y)
        );

        return point;
    }

    copy(source) {
        super.copy(source);

        this.points = [];

        for (let i = 0, l = source.points.length; i < l; i++) {
            const point = source.points[i];

            this.points.push(point.clone());
        }

        return this;
    }

    toJSON() {
        const data = super.toJSON();

        data.points = [];

        for (let i = 0, l = this.points.length; i < l; i++) {
            const point = this.points[i];
            data.points.push(point.toArray());
        }

        return data;
    }

    fromJSON(json) {
        super.fromJSON(json);

        this.points = [];

        for (let i = 0, l = json.points.length; i < l; i++) {
            const point = json.points[i];
            this.points.push(new Vector2().fromArray(point));
        }

        return this;
    }
}

var Curves = /*#__PURE__*/Object.freeze({
    __proto__: null,
    ArcCurve: ArcCurve,
    CatmullRomCurve3: CatmullRomCurve3,
    CubicBezierCurve: CubicBezierCurve,
    CubicBezierCurve3: CubicBezierCurve3,
    EllipseCurve: EllipseCurve,
    LineCurve: LineCurve,
    LineCurve3: LineCurve3,
    QuadraticBezierCurve: QuadraticBezierCurve,
    QuadraticBezierCurve3: QuadraticBezierCurve3,
    SplineCurve: SplineCurve
});

/**************************************************************
 *	Curved Path - a curve path is simply a array of connected
 *  curves, but retains the api of a curve
 **************************************************************/

class CurvePath extends Curve {

	constructor() {

		super();

		this.type = 'CurvePath';

		this.curves = [];
		this.autoClose = false; // Automatically closes the path

	}

	add( curve ) {

		this.curves.push( curve );

	}

	closePath() {

		// Add a line curve if start and end of lines are not connected
		const startPoint = this.curves[ 0 ].getPoint( 0 );
		const endPoint = this.curves[ this.curves.length - 1 ].getPoint( 1 );

		if ( ! startPoint.equals( endPoint ) ) {

			this.curves.push( new LineCurve( endPoint, startPoint ) );

		}

	}

	// To get accurate point with reference to
	// entire path distance at time t,
	// following has to be done:

	// 1. Length of each sub path have to be known
	// 2. Locate and identify type of curve
	// 3. Get t for the curve
	// 4. Return curve.getPointAt(t')

	getPoint( t, optionalTarget ) {

		const d = t * this.getLength();
		const curveLengths = this.getCurveLengths();
		let i = 0;

		// To think about boundaries points.

		while ( i < curveLengths.length ) {

			if ( curveLengths[ i ] >= d ) {

				const diff = curveLengths[ i ] - d;
				const curve = this.curves[ i ];

				const segmentLength = curve.getLength();
				const u = segmentLength === 0 ? 0 : 1 - diff / segmentLength;

				return curve.getPointAt( u, optionalTarget );

			}

			i ++;

		}

		return null;

		// loop where sum != 0, sum > d , sum+1 <d

	}

	// We cannot use the default THREE.Curve getPoint() with getLength() because in
	// THREE.Curve, getLength() depends on getPoint() but in THREE.CurvePath
	// getPoint() depends on getLength

	getLength() {

		const lens = this.getCurveLengths();
		return lens[ lens.length - 1 ];

	}

	// cacheLengths must be recalculated.
	updateArcLengths() {

		this.needsUpdate = true;
		this.cacheLengths = null;
		this.getCurveLengths();

	}

	// Compute lengths and cache them
	// We cannot overwrite getLengths() because UtoT mapping uses it.

	getCurveLengths() {

		// We use cache values if curves and cache array are same length

		if ( this.cacheLengths && this.cacheLengths.length === this.curves.length ) {

			return this.cacheLengths;

		}

		// Get length of sub-curve
		// Push sums into cached array

		const lengths = [];
		let sums = 0;

		for ( let i = 0, l = this.curves.length; i < l; i ++ ) {

			sums += this.curves[ i ].getLength();
			lengths.push( sums );

		}

		this.cacheLengths = lengths;

		return lengths;

	}

	getSpacedPoints( divisions = 40 ) {

		const points = [];

		for ( let i = 0; i <= divisions; i ++ ) {

			points.push( this.getPoint( i / divisions ) );

		}

		if ( this.autoClose ) {

			points.push( points[ 0 ] );

		}

		return points;

	}

	getPoints( divisions = 12 ) {

		const points = [];
		let last;

		for ( let i = 0, curves = this.curves; i < curves.length; i ++ ) {

			const curve = curves[ i ];
			const resolution = curve.isEllipseCurve ? divisions * 2
				: ( curve.isLineCurve || curve.isLineCurve3 ) ? 1
					: curve.isSplineCurve ? divisions * curve.points.length
						: divisions;

			const pts = curve.getPoints( resolution );

			for ( let j = 0; j < pts.length; j ++ ) {

				const point = pts[ j ];

				if ( last && last.equals( point ) ) continue; // ensures no consecutive points are duplicates

				points.push( point );
				last = point;

			}

		}

		if ( this.autoClose && points.length > 1 && ! points[ points.length - 1 ].equals( points[ 0 ] ) ) {

			points.push( points[ 0 ] );

		}

		return points;

	}

	copy( source ) {

		super.copy( source );

		this.curves = [];

		for ( let i = 0, l = source.curves.length; i < l; i ++ ) {

			const curve = source.curves[ i ];

			this.curves.push( curve.clone() );

		}

		this.autoClose = source.autoClose;

		return this;

	}

	toJSON() {

		const data = super.toJSON();

		data.autoClose = this.autoClose;
		data.curves = [];

		for ( let i = 0, l = this.curves.length; i < l; i ++ ) {

			const curve = this.curves[ i ];
			data.curves.push( curve.toJSON() );

		}

		return data;

	}

	fromJSON( json ) {

		super.fromJSON( json );

		this.autoClose = json.autoClose;
		this.curves = [];

		for ( let i = 0, l = json.curves.length; i < l; i ++ ) {

			const curve = json.curves[ i ];
			this.curves.push( new Curves[ curve.type ]().fromJSON( curve ) );

		}

		return this;

	}

}

class Path extends CurvePath {
    constructor(points) {
        super();

        this.type = "Path";

        this.currentPoint = new Vector2();

        if (points) {
            this.setFromPoints(points);
        }
    }

    setFromPoints(points) {
        this.moveTo(points[0].x, points[0].y);

        for (let i = 1, l = points.length; i < l; i++) {
            this.lineTo(points[i].x, points[i].y);
        }

        return this;
    }

    moveTo(x, y) {
        this.currentPoint.set(x, y); // TODO consider referencing vectors instead of copying?

        return this;
    }

    lineTo(x, y) {
        const curve = new LineCurve(
            this.currentPoint.clone(),
            new Vector2(x, y)
        );
        this.curves.push(curve);

        this.currentPoint.set(x, y);

        return this;
    }

    quadraticCurveTo(aCPx, aCPy, aX, aY) {
        const curve = new QuadraticBezierCurve(
            this.currentPoint.clone(),
            new Vector2(aCPx, aCPy),
            new Vector2(aX, aY)
        );

        this.curves.push(curve);

        this.currentPoint.set(aX, aY);

        return this;
    }

    bezierCurveTo(aCP1x, aCP1y, aCP2x, aCP2y, aX, aY) {
        const curve = new CubicBezierCurve(
            this.currentPoint.clone(),
            new Vector2(aCP1x, aCP1y),
            new Vector2(aCP2x, aCP2y),
            new Vector2(aX, aY)
        );

        this.curves.push(curve);

        this.currentPoint.set(aX, aY);

        return this;
    }

    splineThru(pts /*Array of Vector*/) {
        const npts = [this.currentPoint.clone()].concat(pts);

        const curve = new SplineCurve(npts);
        this.curves.push(curve);

        this.currentPoint.copy(pts[pts.length - 1]);

        return this;
    }

    arc(aX, aY, aRadius, aStartAngle, aEndAngle, aClockwise) {
        const x0 = this.currentPoint.x;
        const y0 = this.currentPoint.y;

        this.absarc(
            aX + x0,
            aY + y0,
            aRadius,
            aStartAngle,
            aEndAngle,
            aClockwise
        );

        return this;
    }

    absarc(aX, aY, aRadius, aStartAngle, aEndAngle, aClockwise) {
        this.absellipse(
            aX,
            aY,
            aRadius,
            aRadius,
            aStartAngle,
            aEndAngle,
            aClockwise
        );

        return this;
    }

    ellipse(
        aX,
        aY,
        xRadius,
        yRadius,
        aStartAngle,
        aEndAngle,
        aClockwise,
        aRotation
    ) {
        const x0 = this.currentPoint.x;
        const y0 = this.currentPoint.y;

        this.absellipse(
            aX + x0,
            aY + y0,
            xRadius,
            yRadius,
            aStartAngle,
            aEndAngle,
            aClockwise,
            aRotation
        );

        return this;
    }

    absellipse(
        aX,
        aY,
        xRadius,
        yRadius,
        aStartAngle,
        aEndAngle,
        aClockwise,
        aRotation
    ) {
        const curve = new EllipseCurve(
            aX,
            aY,
            xRadius,
            yRadius,
            aStartAngle,
            aEndAngle,
            aClockwise,
            aRotation
        );

        if (this.curves.length > 0) {
            // if a previous curve is present, attempt to join
            const firstPoint = curve.getPoint(0);

            if (!firstPoint.equals(this.currentPoint)) {
                this.lineTo(firstPoint.x, firstPoint.y);
            }
        }

        this.curves.push(curve);

        const lastPoint = curve.getPoint(1);
        this.currentPoint.copy(lastPoint);

        return this;
    }

    copy(source) {
        super.copy(source);

        this.currentPoint.copy(source.currentPoint);

        return this;
    }

    toJSON() {
        const data = super.toJSON();

        data.currentPoint = this.currentPoint.toArray();

        return data;
    }

    fromJSON(json) {
        super.fromJSON(json);

        this.currentPoint.fromArray(json.currentPoint);

        return this;
    }
}

class Shape extends Path {
    constructor(points) {
        super(points);

        this.uuid = generateUUID();

        this.type = "Shape";

        this.holes = [];
    }

    getPointsHoles(divisions) {
        const holesPts = [];

        for (let i = 0, l = this.holes.length; i < l; i++) {
            holesPts[i] = this.holes[i].getPoints(divisions);
        }

        return holesPts;
    }

    // get points of shape and holes (keypoints based on segments parameter)

    extractPoints(divisions) {
        return {
            shape: this.getPoints(divisions),
            holes: this.getPointsHoles(divisions),
        };
    }

    copy(source) {
        super.copy(source);

        this.holes = [];

        for (let i = 0, l = source.holes.length; i < l; i++) {
            const hole = source.holes[i];

            this.holes.push(hole.clone());
        }

        return this;
    }

    toJSON() {
        const data = super.toJSON();

        data.uuid = this.uuid;
        data.holes = [];

        for (let i = 0, l = this.holes.length; i < l; i++) {
            const hole = this.holes[i];
            data.holes.push(hole.toJSON());
        }

        return data;
    }

    fromJSON(json) {
        super.fromJSON(json);

        this.uuid = json.uuid;
        this.holes = [];

        for (let i = 0, l = json.holes.length; i < l; i++) {
            const hole = json.holes[i];
            this.holes.push(new Path().fromJSON(hole));
        }

        return this;
    }
}

const SRGBColorSpace = 'srgb';
const LinearSRGBColorSpace = 'srgb-linear';

function SRGBToLinear( c ) {

	return ( c < 0.04045 ) ? c * 0.0773993808 : Math.pow( c * 0.9478672986 + 0.0521327014, 2.4 );

}

function LinearToSRGB( c ) {

	return ( c < 0.0031308 ) ? c * 12.92 : 1.055 * ( Math.pow( c, 0.41666 ) ) - 0.055;

}

// JavaScript RGB-to-RGB transforms, defined as
// FN[InputColorSpace][OutputColorSpace] callback functions.
const FN = {
	[ SRGBColorSpace ]: { [ LinearSRGBColorSpace ]: SRGBToLinear },
	[ LinearSRGBColorSpace ]: { [ SRGBColorSpace ]: LinearToSRGB },
};

const ColorManagement = {

	legacyMode: true,

	get workingColorSpace() {

		return LinearSRGBColorSpace;

	},

	set workingColorSpace( colorSpace ) {

		console.warn( 'THREE.ColorManagement: .workingColorSpace is readonly.' );

	},

	convert: function ( color, sourceColorSpace, targetColorSpace ) {

		if ( this.legacyMode || sourceColorSpace === targetColorSpace || ! sourceColorSpace || ! targetColorSpace ) {

			return color;

		}

		if ( FN[ sourceColorSpace ] && FN[ sourceColorSpace ][ targetColorSpace ] !== undefined ) {

			const fn = FN[ sourceColorSpace ][ targetColorSpace ];

			color.r = fn( color.r );
			color.g = fn( color.g );
			color.b = fn( color.b );

			return color;

		}

		throw new Error( 'Unsupported color space conversion.' );

	},

	fromWorkingColorSpace: function ( color, targetColorSpace ) {

		return this.convert( color, this.workingColorSpace, targetColorSpace );

	},

	toWorkingColorSpace: function ( color, sourceColorSpace ) {

		return this.convert( color, sourceColorSpace, this.workingColorSpace );

	},

};

const _colorKeywords = { 'aliceblue': 0xF0F8FF, 'antiquewhite': 0xFAEBD7, 'aqua': 0x00FFFF, 'aquamarine': 0x7FFFD4, 'azure': 0xF0FFFF,
	'beige': 0xF5F5DC, 'bisque': 0xFFE4C4, 'black': 0x000000, 'blanchedalmond': 0xFFEBCD, 'blue': 0x0000FF, 'blueviolet': 0x8A2BE2,
	'brown': 0xA52A2A, 'burlywood': 0xDEB887, 'cadetblue': 0x5F9EA0, 'chartreuse': 0x7FFF00, 'chocolate': 0xD2691E, 'coral': 0xFF7F50,
	'cornflowerblue': 0x6495ED, 'cornsilk': 0xFFF8DC, 'crimson': 0xDC143C, 'cyan': 0x00FFFF, 'darkblue': 0x00008B, 'darkcyan': 0x008B8B,
	'darkgoldenrod': 0xB8860B, 'darkgray': 0xA9A9A9, 'darkgreen': 0x006400, 'darkgrey': 0xA9A9A9, 'darkkhaki': 0xBDB76B, 'darkmagenta': 0x8B008B,
	'darkolivegreen': 0x556B2F, 'darkorange': 0xFF8C00, 'darkorchid': 0x9932CC, 'darkred': 0x8B0000, 'darksalmon': 0xE9967A, 'darkseagreen': 0x8FBC8F,
	'darkslateblue': 0x483D8B, 'darkslategray': 0x2F4F4F, 'darkslategrey': 0x2F4F4F, 'darkturquoise': 0x00CED1, 'darkviolet': 0x9400D3,
	'deeppink': 0xFF1493, 'deepskyblue': 0x00BFFF, 'dimgray': 0x696969, 'dimgrey': 0x696969, 'dodgerblue': 0x1E90FF, 'firebrick': 0xB22222,
	'floralwhite': 0xFFFAF0, 'forestgreen': 0x228B22, 'fuchsia': 0xFF00FF, 'gainsboro': 0xDCDCDC, 'ghostwhite': 0xF8F8FF, 'gold': 0xFFD700,
	'goldenrod': 0xDAA520, 'gray': 0x808080, 'green': 0x008000, 'greenyellow': 0xADFF2F, 'grey': 0x808080, 'honeydew': 0xF0FFF0, 'hotpink': 0xFF69B4,
	'indianred': 0xCD5C5C, 'indigo': 0x4B0082, 'ivory': 0xFFFFF0, 'khaki': 0xF0E68C, 'lavender': 0xE6E6FA, 'lavenderblush': 0xFFF0F5, 'lawngreen': 0x7CFC00,
	'lemonchiffon': 0xFFFACD, 'lightblue': 0xADD8E6, 'lightcoral': 0xF08080, 'lightcyan': 0xE0FFFF, 'lightgoldenrodyellow': 0xFAFAD2, 'lightgray': 0xD3D3D3,
	'lightgreen': 0x90EE90, 'lightgrey': 0xD3D3D3, 'lightpink': 0xFFB6C1, 'lightsalmon': 0xFFA07A, 'lightseagreen': 0x20B2AA, 'lightskyblue': 0x87CEFA,
	'lightslategray': 0x778899, 'lightslategrey': 0x778899, 'lightsteelblue': 0xB0C4DE, 'lightyellow': 0xFFFFE0, 'lime': 0x00FF00, 'limegreen': 0x32CD32,
	'linen': 0xFAF0E6, 'magenta': 0xFF00FF, 'maroon': 0x800000, 'mediumaquamarine': 0x66CDAA, 'mediumblue': 0x0000CD, 'mediumorchid': 0xBA55D3,
	'mediumpurple': 0x9370DB, 'mediumseagreen': 0x3CB371, 'mediumslateblue': 0x7B68EE, 'mediumspringgreen': 0x00FA9A, 'mediumturquoise': 0x48D1CC,
	'mediumvioletred': 0xC71585, 'midnightblue': 0x191970, 'mintcream': 0xF5FFFA, 'mistyrose': 0xFFE4E1, 'moccasin': 0xFFE4B5, 'navajowhite': 0xFFDEAD,
	'navy': 0x000080, 'oldlace': 0xFDF5E6, 'olive': 0x808000, 'olivedrab': 0x6B8E23, 'orange': 0xFFA500, 'orangered': 0xFF4500, 'orchid': 0xDA70D6,
	'palegoldenrod': 0xEEE8AA, 'palegreen': 0x98FB98, 'paleturquoise': 0xAFEEEE, 'palevioletred': 0xDB7093, 'papayawhip': 0xFFEFD5, 'peachpuff': 0xFFDAB9,
	'peru': 0xCD853F, 'pink': 0xFFC0CB, 'plum': 0xDDA0DD, 'powderblue': 0xB0E0E6, 'purple': 0x800080, 'rebeccapurple': 0x663399, 'red': 0xFF0000, 'rosybrown': 0xBC8F8F,
	'royalblue': 0x4169E1, 'saddlebrown': 0x8B4513, 'salmon': 0xFA8072, 'sandybrown': 0xF4A460, 'seagreen': 0x2E8B57, 'seashell': 0xFFF5EE,
	'sienna': 0xA0522D, 'silver': 0xC0C0C0, 'skyblue': 0x87CEEB, 'slateblue': 0x6A5ACD, 'slategray': 0x708090, 'slategrey': 0x708090, 'snow': 0xFFFAFA,
	'springgreen': 0x00FF7F, 'steelblue': 0x4682B4, 'tan': 0xD2B48C, 'teal': 0x008080, 'thistle': 0xD8BFD8, 'tomato': 0xFF6347, 'turquoise': 0x40E0D0,
	'violet': 0xEE82EE, 'wheat': 0xF5DEB3, 'white': 0xFFFFFF, 'whitesmoke': 0xF5F5F5, 'yellow': 0xFFFF00, 'yellowgreen': 0x9ACD32 };

const _rgb = { r: 0, g: 0, b: 0 };
const _hslA = { h: 0, s: 0, l: 0 };
const _hslB = { h: 0, s: 0, l: 0 };

function hue2rgb( p, q, t ) {

	if ( t < 0 ) t += 1;
	if ( t > 1 ) t -= 1;
	if ( t < 1 / 6 ) return p + ( q - p ) * 6 * t;
	if ( t < 1 / 2 ) return q;
	if ( t < 2 / 3 ) return p + ( q - p ) * 6 * ( 2 / 3 - t );
	return p;

}

function toComponents( source, target ) {

	target.r = source.r;
	target.g = source.g;
	target.b = source.b;

	return target;

}

class Color {

	constructor( r, g, b ) {

		this.isColor = true;

		this.r = 1;
		this.g = 1;
		this.b = 1;

		if ( g === undefined && b === undefined ) {

			// r is THREE.Color, hex or string
			return this.set( r );

		}

		return this.setRGB( r, g, b );

	}

	set( value ) {

		if ( value && value.isColor ) {

			this.copy( value );

		} else if ( typeof value === 'number' ) {

			this.setHex( value );

		} else if ( typeof value === 'string' ) {

			this.setStyle( value );

		}

		return this;

	}

	setScalar( scalar ) {

		this.r = scalar;
		this.g = scalar;
		this.b = scalar;

		return this;

	}

	setHex( hex, colorSpace = SRGBColorSpace ) {

		hex = Math.floor( hex );

		this.r = ( hex >> 16 & 255 ) / 255;
		this.g = ( hex >> 8 & 255 ) / 255;
		this.b = ( hex & 255 ) / 255;

		ColorManagement.toWorkingColorSpace( this, colorSpace );

		return this;

	}

	setRGB( r, g, b, colorSpace = LinearSRGBColorSpace ) {

		this.r = r;
		this.g = g;
		this.b = b;

		ColorManagement.toWorkingColorSpace( this, colorSpace );

		return this;

	}

	setHSL( h, s, l, colorSpace = LinearSRGBColorSpace ) {

		// h,s,l ranges are in 0.0 - 1.0
		h = euclideanModulo( h, 1 );
		s = clamp( s, 0, 1 );
		l = clamp( l, 0, 1 );

		if ( s === 0 ) {

			this.r = this.g = this.b = l;

		} else {

			const p = l <= 0.5 ? l * ( 1 + s ) : l + s - ( l * s );
			const q = ( 2 * l ) - p;

			this.r = hue2rgb( q, p, h + 1 / 3 );
			this.g = hue2rgb( q, p, h );
			this.b = hue2rgb( q, p, h - 1 / 3 );

		}

		ColorManagement.toWorkingColorSpace( this, colorSpace );

		return this;

	}

	setStyle( style, colorSpace = SRGBColorSpace ) {

		function handleAlpha( string ) {

			if ( string === undefined ) return;

			if ( parseFloat( string ) < 1 ) {

				console.warn( 'THREE.Color: Alpha component of ' + style + ' will be ignored.' );

			}

		}


		let m;

		if ( m = /^((?:rgb|hsl)a?)\(([^\)]*)\)/.exec( style ) ) {

			// rgb / hsl

			let color;
			const name = m[ 1 ];
			const components = m[ 2 ];

			switch ( name ) {

				case 'rgb':
				case 'rgba':

					if ( color = /^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec( components ) ) {

						// rgb(255,0,0) rgba(255,0,0,0.5)
						this.r = Math.min( 255, parseInt( color[ 1 ], 10 ) ) / 255;
						this.g = Math.min( 255, parseInt( color[ 2 ], 10 ) ) / 255;
						this.b = Math.min( 255, parseInt( color[ 3 ], 10 ) ) / 255;

						ColorManagement.toWorkingColorSpace( this, colorSpace );

						handleAlpha( color[ 4 ] );

						return this;

					}

					if ( color = /^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec( components ) ) {

						// rgb(100%,0%,0%) rgba(100%,0%,0%,0.5)
						this.r = Math.min( 100, parseInt( color[ 1 ], 10 ) ) / 100;
						this.g = Math.min( 100, parseInt( color[ 2 ], 10 ) ) / 100;
						this.b = Math.min( 100, parseInt( color[ 3 ], 10 ) ) / 100;

						ColorManagement.toWorkingColorSpace( this, colorSpace );

						handleAlpha( color[ 4 ] );

						return this;

					}

					break;

				case 'hsl':
				case 'hsla':

					if ( color = /^\s*(\d*\.?\d+)\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec( components ) ) {

						// hsl(120,50%,50%) hsla(120,50%,50%,0.5)
						const h = parseFloat( color[ 1 ] ) / 360;
						const s = parseInt( color[ 2 ], 10 ) / 100;
						const l = parseInt( color[ 3 ], 10 ) / 100;

						handleAlpha( color[ 4 ] );

						return this.setHSL( h, s, l, colorSpace );

					}

					break;

			}

		} else if ( m = /^\#([A-Fa-f\d]+)$/.exec( style ) ) {

			// hex color

			const hex = m[ 1 ];
			const size = hex.length;

			if ( size === 3 ) {

				// #ff0
				this.r = parseInt( hex.charAt( 0 ) + hex.charAt( 0 ), 16 ) / 255;
				this.g = parseInt( hex.charAt( 1 ) + hex.charAt( 1 ), 16 ) / 255;
				this.b = parseInt( hex.charAt( 2 ) + hex.charAt( 2 ), 16 ) / 255;

				ColorManagement.toWorkingColorSpace( this, colorSpace );

				return this;

			} else if ( size === 6 ) {

				// #ff0000
				this.r = parseInt( hex.charAt( 0 ) + hex.charAt( 1 ), 16 ) / 255;
				this.g = parseInt( hex.charAt( 2 ) + hex.charAt( 3 ), 16 ) / 255;
				this.b = parseInt( hex.charAt( 4 ) + hex.charAt( 5 ), 16 ) / 255;

				ColorManagement.toWorkingColorSpace( this, colorSpace );

				return this;

			}

		}

		if ( style && style.length > 0 ) {

			return this.setColorName( style, colorSpace );

		}

		return this;

	}

	setColorName( style, colorSpace = SRGBColorSpace ) {

		// color keywords
		const hex = _colorKeywords[ style.toLowerCase() ];

		if ( hex !== undefined ) {

			// red
			this.setHex( hex, colorSpace );

		} else {

			// unknown color
			console.warn( 'THREE.Color: Unknown color ' + style );

		}

		return this;

	}

	clone() {

		return new this.constructor( this.r, this.g, this.b );

	}

	copy( color ) {

		this.r = color.r;
		this.g = color.g;
		this.b = color.b;

		return this;

	}

	copySRGBToLinear( color ) {

		this.r = SRGBToLinear( color.r );
		this.g = SRGBToLinear( color.g );
		this.b = SRGBToLinear( color.b );

		return this;

	}

	copyLinearToSRGB( color ) {

		this.r = LinearToSRGB( color.r );
		this.g = LinearToSRGB( color.g );
		this.b = LinearToSRGB( color.b );

		return this;

	}

	convertSRGBToLinear() {

		this.copySRGBToLinear( this );

		return this;

	}

	convertLinearToSRGB() {

		this.copyLinearToSRGB( this );

		return this;

	}

	getHex( colorSpace = SRGBColorSpace ) {

		ColorManagement.fromWorkingColorSpace( toComponents( this, _rgb ), colorSpace );

		return clamp( _rgb.r * 255, 0, 255 ) << 16 ^ clamp( _rgb.g * 255, 0, 255 ) << 8 ^ clamp( _rgb.b * 255, 0, 255 ) << 0;

	}

	getHexString( colorSpace = SRGBColorSpace ) {

		return ( '000000' + this.getHex( colorSpace ).toString( 16 ) ).slice( - 6 );

	}

	getHSL( target, colorSpace = LinearSRGBColorSpace ) {

		// h,s,l ranges are in 0.0 - 1.0

		ColorManagement.fromWorkingColorSpace( toComponents( this, _rgb ), colorSpace );

		const r = _rgb.r, g = _rgb.g, b = _rgb.b;

		const max = Math.max( r, g, b );
		const min = Math.min( r, g, b );

		let hue, saturation;
		const lightness = ( min + max ) / 2.0;

		if ( min === max ) {

			hue = 0;
			saturation = 0;

		} else {

			const delta = max - min;

			saturation = lightness <= 0.5 ? delta / ( max + min ) : delta / ( 2 - max - min );

			switch ( max ) {

				case r: hue = ( g - b ) / delta + ( g < b ? 6 : 0 ); break;
				case g: hue = ( b - r ) / delta + 2; break;
				case b: hue = ( r - g ) / delta + 4; break;

			}

			hue /= 6;

		}

		target.h = hue;
		target.s = saturation;
		target.l = lightness;

		return target;

	}

	getRGB( target, colorSpace = LinearSRGBColorSpace ) {

		ColorManagement.fromWorkingColorSpace( toComponents( this, _rgb ), colorSpace );

		target.r = _rgb.r;
		target.g = _rgb.g;
		target.b = _rgb.b;

		return target;

	}

	getStyle( colorSpace = SRGBColorSpace ) {

		ColorManagement.fromWorkingColorSpace( toComponents( this, _rgb ), colorSpace );

		if ( colorSpace !== SRGBColorSpace ) {

			// Requires CSS Color Module Level 4 (https://www.w3.org/TR/css-color-4/).
			return `color(${ colorSpace } ${ _rgb.r } ${ _rgb.g } ${ _rgb.b })`;

		}

		return `rgb(${( _rgb.r * 255 ) | 0},${( _rgb.g * 255 ) | 0},${( _rgb.b * 255 ) | 0})`;

	}

	offsetHSL( h, s, l ) {

		this.getHSL( _hslA );

		_hslA.h += h; _hslA.s += s; _hslA.l += l;

		this.setHSL( _hslA.h, _hslA.s, _hslA.l );

		return this;

	}

	add( color ) {

		this.r += color.r;
		this.g += color.g;
		this.b += color.b;

		return this;

	}

	addColors( color1, color2 ) {

		this.r = color1.r + color2.r;
		this.g = color1.g + color2.g;
		this.b = color1.b + color2.b;

		return this;

	}

	addScalar( s ) {

		this.r += s;
		this.g += s;
		this.b += s;

		return this;

	}

	sub( color ) {

		this.r = Math.max( 0, this.r - color.r );
		this.g = Math.max( 0, this.g - color.g );
		this.b = Math.max( 0, this.b - color.b );

		return this;

	}

	multiply( color ) {

		this.r *= color.r;
		this.g *= color.g;
		this.b *= color.b;

		return this;

	}

	multiplyScalar( s ) {

		this.r *= s;
		this.g *= s;
		this.b *= s;

		return this;

	}

	lerp( color, alpha ) {

		this.r += ( color.r - this.r ) * alpha;
		this.g += ( color.g - this.g ) * alpha;
		this.b += ( color.b - this.b ) * alpha;

		return this;

	}

	lerpColors( color1, color2, alpha ) {

		this.r = color1.r + ( color2.r - color1.r ) * alpha;
		this.g = color1.g + ( color2.g - color1.g ) * alpha;
		this.b = color1.b + ( color2.b - color1.b ) * alpha;

		return this;

	}

	lerpHSL( color, alpha ) {

		this.getHSL( _hslA );
		color.getHSL( _hslB );

		const h = lerp( _hslA.h, _hslB.h, alpha );
		const s = lerp( _hslA.s, _hslB.s, alpha );
		const l = lerp( _hslA.l, _hslB.l, alpha );

		this.setHSL( h, s, l );

		return this;

	}

	equals( c ) {

		return ( c.r === this.r ) && ( c.g === this.g ) && ( c.b === this.b );

	}

	fromArray( array, offset = 0 ) {

		this.r = array[ offset ];
		this.g = array[ offset + 1 ];
		this.b = array[ offset + 2 ];

		return this;

	}

	toArray( array = [], offset = 0 ) {

		array[ offset ] = this.r;
		array[ offset + 1 ] = this.g;
		array[ offset + 2 ] = this.b;

		return array;

	}

	fromBufferAttribute( attribute, index ) {

		this.r = attribute.getX( index );
		this.g = attribute.getY( index );
		this.b = attribute.getZ( index );

		if ( attribute.normalized === true ) {

			// assuming Uint8Array

			this.r /= 255;
			this.g /= 255;
			this.b /= 255;

		}

		return this;

	}

	toJSON() {

		return this.getHex();

	}

	*[ Symbol.iterator ]() {

		yield this.r;
		yield this.g;
		yield this.b;

	}

}

Color.NAMES = _colorKeywords;

// mapbox开源算法

function earcut(data, holeIndices, dim) {
    dim = dim || 2;

    var hasHoles = holeIndices && holeIndices.length,
        outerLen = hasHoles ? holeIndices[0] * dim : data.length,
        outerNode = linkedList(data, 0, outerLen, dim, true),
        triangles = [];

    if (!outerNode || outerNode.next === outerNode.prev) return triangles;

    var minX, minY, maxX, maxY, x, y, invSize;

    if (hasHoles) outerNode = eliminateHoles(data, holeIndices, outerNode, dim);

    // if the shape is not too simple, we'll use z-order curve hash later; calculate polygon bbox
    if (data.length > 80 * dim) {
        minX = maxX = data[0];
        minY = maxY = data[1];

        for (var i = dim; i < outerLen; i += dim) {
            x = data[i];
            y = data[i + 1];
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
        }

        // minX, minY and invSize are later used to transform coords into integers for z-order calculation
        invSize = Math.max(maxX - minX, maxY - minY);
        invSize = invSize !== 0 ? 1 / invSize : 0;
    }

    earcutLinked(outerNode, triangles, dim, minX, minY, invSize);

    return triangles;
}

// create a circular doubly linked list from polygon points in the specified winding order
function linkedList(data, start, end, dim, clockwise) {
    var i, last;

    if (clockwise === signedArea(data, start, end, dim) > 0) {
        for (i = start; i < end; i += dim)
            last = insertNode(i, data[i], data[i + 1], last);
    } else {
        for (i = end - dim; i >= start; i -= dim)
            last = insertNode(i, data[i], data[i + 1], last);
    }

    if (last && equals(last, last.next)) {
        removeNode(last);
        last = last.next;
    }

    return last;
}

// eliminate colinear or duplicate points
function filterPoints(start, end) {
    if (!start) return start;
    if (!end) end = start;

    var p = start,
        again;
    do {
        again = false;

        if (
            !p.steiner &&
            (equals(p, p.next) || area(p.prev, p, p.next) === 0)
        ) {
            removeNode(p);
            p = end = p.prev;
            if (p === p.next) break;
            again = true;
        } else {
            p = p.next;
        }
    } while (again || p !== end);

    return end;
}

// main ear slicing loop which triangulates a polygon (given as a linked list)
function earcutLinked(ear, triangles, dim, minX, minY, invSize, pass) {
    if (!ear) return;

    // interlink polygon nodes in z-order
    if (!pass && invSize) indexCurve(ear, minX, minY, invSize);

    var stop = ear,
        prev,
        next;

    // iterate through ears, slicing them one by one
    while (ear.prev !== ear.next) {
        prev = ear.prev;
        next = ear.next;

        if (invSize ? isEarHashed(ear, minX, minY, invSize) : isEar(ear)) {
            // cut off the triangle
            triangles.push(prev.i / dim);
            triangles.push(ear.i / dim);
            triangles.push(next.i / dim);

            removeNode(ear);

            // skipping the next vertex leads to less sliver triangles
            ear = next.next;
            stop = next.next;

            continue;
        }

        ear = next;

        // if we looped through the whole remaining polygon and can't find any more ears
        if (ear === stop) {
            // try filtering points and slicing again
            if (!pass) {
                earcutLinked(
                    filterPoints(ear),
                    triangles,
                    dim,
                    minX,
                    minY,
                    invSize,
                    1
                );

                // if this didn't work, try curing all small self-intersections locally
            } else if (pass === 1) {
                ear = cureLocalIntersections(filterPoints(ear), triangles, dim);
                earcutLinked(ear, triangles, dim, minX, minY, invSize, 2);

                // as a last resort, try splitting the remaining polygon into two
            } else if (pass === 2) {
                splitEarcut(ear, triangles, dim, minX, minY, invSize);
            }

            break;
        }
    }
}

// check whether a polygon node forms a valid ear with adjacent nodes
function isEar(ear) {
    var a = ear.prev,
        b = ear,
        c = ear.next;

    if (area(a, b, c) >= 0) return false; // reflex, can't be an ear

    // now make sure we don't have other points inside the potential ear
    var p = ear.next.next;

    while (p !== ear.prev) {
        if (
            pointInTriangle(a.x, a.y, b.x, b.y, c.x, c.y, p.x, p.y) &&
            area(p.prev, p, p.next) >= 0
        )
            return false;
        p = p.next;
    }

    return true;
}

function isEarHashed(ear, minX, minY, invSize) {
    var a = ear.prev,
        b = ear,
        c = ear.next;

    if (area(a, b, c) >= 0) return false; // reflex, can't be an ear

    // triangle bbox; min & max are calculated like this for speed
    var minTX = a.x < b.x ? (a.x < c.x ? a.x : c.x) : b.x < c.x ? b.x : c.x,
        minTY = a.y < b.y ? (a.y < c.y ? a.y : c.y) : b.y < c.y ? b.y : c.y,
        maxTX = a.x > b.x ? (a.x > c.x ? a.x : c.x) : b.x > c.x ? b.x : c.x,
        maxTY = a.y > b.y ? (a.y > c.y ? a.y : c.y) : b.y > c.y ? b.y : c.y;

    // z-order range for the current triangle bbox;
    var minZ = zOrder(minTX, minTY, minX, minY, invSize),
        maxZ = zOrder(maxTX, maxTY, minX, minY, invSize);

    var p = ear.prevZ,
        n = ear.nextZ;

    // look for points inside the triangle in both directions
    while (p && p.z >= minZ && n && n.z <= maxZ) {
        if (
            p !== ear.prev &&
            p !== ear.next &&
            pointInTriangle(a.x, a.y, b.x, b.y, c.x, c.y, p.x, p.y) &&
            area(p.prev, p, p.next) >= 0
        )
            return false;
        p = p.prevZ;

        if (
            n !== ear.prev &&
            n !== ear.next &&
            pointInTriangle(a.x, a.y, b.x, b.y, c.x, c.y, n.x, n.y) &&
            area(n.prev, n, n.next) >= 0
        )
            return false;
        n = n.nextZ;
    }

    // look for remaining points in decreasing z-order
    while (p && p.z >= minZ) {
        if (
            p !== ear.prev &&
            p !== ear.next &&
            pointInTriangle(a.x, a.y, b.x, b.y, c.x, c.y, p.x, p.y) &&
            area(p.prev, p, p.next) >= 0
        )
            return false;
        p = p.prevZ;
    }

    // look for remaining points in increasing z-order
    while (n && n.z <= maxZ) {
        if (
            n !== ear.prev &&
            n !== ear.next &&
            pointInTriangle(a.x, a.y, b.x, b.y, c.x, c.y, n.x, n.y) &&
            area(n.prev, n, n.next) >= 0
        )
            return false;
        n = n.nextZ;
    }

    return true;
}

// go through all polygon nodes and cure small local self-intersections
function cureLocalIntersections(start, triangles, dim) {
    var p = start;
    do {
        var a = p.prev,
            b = p.next.next;

        if (
            !equals(a, b) &&
            intersects(a, p, p.next, b) &&
            locallyInside(a, b) &&
            locallyInside(b, a)
        ) {
            triangles.push(a.i / dim);
            triangles.push(p.i / dim);
            triangles.push(b.i / dim);

            // remove two nodes involved
            removeNode(p);
            removeNode(p.next);

            p = start = b;
        }
        p = p.next;
    } while (p !== start);

    return filterPoints(p);
}

// try splitting polygon into two and triangulate them independently
function splitEarcut(start, triangles, dim, minX, minY, invSize) {
    // look for a valid diagonal that divides the polygon into two
    var a = start;
    do {
        var b = a.next.next;
        while (b !== a.prev) {
            if (a.i !== b.i && isValidDiagonal(a, b)) {
                // split the polygon in two by the diagonal
                var c = splitPolygon(a, b);

                // filter colinear points around the cuts
                a = filterPoints(a, a.next);
                c = filterPoints(c, c.next);

                // run earcut on each half
                earcutLinked(a, triangles, dim, minX, minY, invSize);
                earcutLinked(c, triangles, dim, minX, minY, invSize);
                return;
            }
            b = b.next;
        }
        a = a.next;
    } while (a !== start);
}

// link every hole into the outer loop, producing a single-ring polygon without holes
function eliminateHoles(data, holeIndices, outerNode, dim) {
    var queue = [],
        i,
        len,
        start,
        end,
        list;

    for (i = 0, len = holeIndices.length; i < len; i++) {
        start = holeIndices[i] * dim;
        end = i < len - 1 ? holeIndices[i + 1] * dim : data.length;
        list = linkedList(data, start, end, dim, false);
        if (list === list.next) list.steiner = true;
        queue.push(getLeftmost(list));
    }

    queue.sort(compareX);

    // process holes from left to right
    for (i = 0; i < queue.length; i++) {
        outerNode = eliminateHole(queue[i], outerNode);
        outerNode = filterPoints(outerNode, outerNode.next);
    }

    return outerNode;
}

function compareX(a, b) {
    return a.x - b.x;
}

// find a bridge between vertices that connects hole with an outer ring and and link it
function eliminateHole(hole, outerNode) {
    var bridge = findHoleBridge(hole, outerNode);
    if (!bridge) {
        return outerNode;
    }

    var bridgeReverse = splitPolygon(bridge, hole);

    // filter collinear points around the cuts
    var filteredBridge = filterPoints(bridge, bridge.next);
    filterPoints(bridgeReverse, bridgeReverse.next);

    // Check if input node was removed by the filtering
    return outerNode === bridge ? filteredBridge : outerNode;
}

// David Eberly's algorithm for finding a bridge between hole and outer polygon
function findHoleBridge(hole, outerNode) {
    var p = outerNode,
        hx = hole.x,
        hy = hole.y,
        qx = -Infinity,
        m;

    // find a segment intersected by a ray from the hole's leftmost point to the left;
    // segment's endpoint with lesser x will be potential connection point
    do {
        if (hy <= p.y && hy >= p.next.y && p.next.y !== p.y) {
            var x = p.x + ((hy - p.y) * (p.next.x - p.x)) / (p.next.y - p.y);
            if (x <= hx && x > qx) {
                qx = x;
                if (x === hx) {
                    if (hy === p.y) return p;
                    if (hy === p.next.y) return p.next;
                }
                m = p.x < p.next.x ? p : p.next;
            }
        }
        p = p.next;
    } while (p !== outerNode);

    if (!m) return null;

    if (hx === qx) return m; // hole touches outer segment; pick leftmost endpoint

    // look for points inside the triangle of hole point, segment intersection and endpoint;
    // if there are no points found, we have a valid connection;
    // otherwise choose the point of the minimum angle with the ray as connection point

    var stop = m,
        mx = m.x,
        my = m.y,
        tanMin = Infinity,
        tan;

    p = m;

    do {
        if (
            hx >= p.x &&
            p.x >= mx &&
            hx !== p.x &&
            pointInTriangle(
                hy < my ? hx : qx,
                hy,
                mx,
                my,
                hy < my ? qx : hx,
                hy,
                p.x,
                p.y
            )
        ) {
            tan = Math.abs(hy - p.y) / (hx - p.x); // tangential

            if (
                locallyInside(p, hole) &&
                (tan < tanMin ||
                    (tan === tanMin &&
                        (p.x > m.x ||
                            (p.x === m.x && sectorContainsSector(m, p)))))
            ) {
                m = p;
                tanMin = tan;
            }
        }

        p = p.next;
    } while (p !== stop);

    return m;
}

// whether sector in vertex m contains sector in vertex p in the same coordinates
function sectorContainsSector(m, p) {
    return area(m.prev, m, p.prev) < 0 && area(p.next, m, m.next) < 0;
}

// interlink polygon nodes in z-order
function indexCurve(start, minX, minY, invSize) {
    var p = start;
    do {
        if (p.z === null) p.z = zOrder(p.x, p.y, minX, minY, invSize);
        p.prevZ = p.prev;
        p.nextZ = p.next;
        p = p.next;
    } while (p !== start);

    p.prevZ.nextZ = null;
    p.prevZ = null;

    sortLinked(p);
}

// Simon Tatham's linked list merge sort algorithm
// http://www.chiark.greenend.org.uk/~sgtatham/algorithms/listsort.html
function sortLinked(list) {
    var i,
        p,
        q,
        e,
        tail,
        numMerges,
        pSize,
        qSize,
        inSize = 1;

    do {
        p = list;
        list = null;
        tail = null;
        numMerges = 0;

        while (p) {
            numMerges++;
            q = p;
            pSize = 0;
            for (i = 0; i < inSize; i++) {
                pSize++;
                q = q.nextZ;
                if (!q) break;
            }
            qSize = inSize;

            while (pSize > 0 || (qSize > 0 && q)) {
                if (pSize !== 0 && (qSize === 0 || !q || p.z <= q.z)) {
                    e = p;
                    p = p.nextZ;
                    pSize--;
                } else {
                    e = q;
                    q = q.nextZ;
                    qSize--;
                }

                if (tail) tail.nextZ = e;
                else list = e;

                e.prevZ = tail;
                tail = e;
            }

            p = q;
        }

        tail.nextZ = null;
        inSize *= 2;
    } while (numMerges > 1);

    return list;
}

// z-order of a point given coords and inverse of the longer side of data bbox
function zOrder(x, y, minX, minY, invSize) {
    // coords are transformed into non-negative 15-bit integer range
    x = 32767 * (x - minX) * invSize;
    y = 32767 * (y - minY) * invSize;

    x = (x | (x << 8)) & 0x00ff00ff;
    x = (x | (x << 4)) & 0x0f0f0f0f;
    x = (x | (x << 2)) & 0x33333333;
    x = (x | (x << 1)) & 0x55555555;

    y = (y | (y << 8)) & 0x00ff00ff;
    y = (y | (y << 4)) & 0x0f0f0f0f;
    y = (y | (y << 2)) & 0x33333333;
    y = (y | (y << 1)) & 0x55555555;

    return x | (y << 1);
}

// find the leftmost node of a polygon ring
function getLeftmost(start) {
    var p = start,
        leftmost = start;
    do {
        if (p.x < leftmost.x || (p.x === leftmost.x && p.y < leftmost.y))
            leftmost = p;
        p = p.next;
    } while (p !== start);

    return leftmost;
}

// check if a point lies within a convex triangle
function pointInTriangle(ax, ay, bx, by, cx, cy, px, py) {
    return (
        (cx - px) * (ay - py) - (ax - px) * (cy - py) >= 0 &&
        (ax - px) * (by - py) - (bx - px) * (ay - py) >= 0 &&
        (bx - px) * (cy - py) - (cx - px) * (by - py) >= 0
    );
}

// check if a diagonal between two polygon nodes is valid (lies in polygon interior)
function isValidDiagonal(a, b) {
    return (
        a.next.i !== b.i &&
        a.prev.i !== b.i &&
        !intersectsPolygon(a, b) && // dones't intersect other edges
        ((locallyInside(a, b) &&
        locallyInside(b, a) &&
        middleInside(a, b) && // locally visible
            (area(a.prev, a, b.prev) || area(a, b.prev, b))) || // does not create opposite-facing sectors
            (equals(a, b) &&
                area(a.prev, a, a.next) > 0 &&
                area(b.prev, b, b.next) > 0))
    ); // special zero-length case
}

// signed area of a triangle
function area(p, q, r) {
    return (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
}

// check if two points are equal
function equals(p1, p2) {
    return p1.x === p2.x && p1.y === p2.y;
}

// check if two segments intersect
function intersects(p1, q1, p2, q2) {
    var o1 = sign(area(p1, q1, p2));
    var o2 = sign(area(p1, q1, q2));
    var o3 = sign(area(p2, q2, p1));
    var o4 = sign(area(p2, q2, q1));

    if (o1 !== o2 && o3 !== o4) return true; // general case

    if (o1 === 0 && onSegment(p1, p2, q1)) return true; // p1, q1 and p2 are collinear and p2 lies on p1q1
    if (o2 === 0 && onSegment(p1, q2, q1)) return true; // p1, q1 and q2 are collinear and q2 lies on p1q1
    if (o3 === 0 && onSegment(p2, p1, q2)) return true; // p2, q2 and p1 are collinear and p1 lies on p2q2
    if (o4 === 0 && onSegment(p2, q1, q2)) return true; // p2, q2 and q1 are collinear and q1 lies on p2q2

    return false;
}

// for collinear points p, q, r, check if point q lies on segment pr
function onSegment(p, q, r) {
    return (
        q.x <= Math.max(p.x, r.x) &&
        q.x >= Math.min(p.x, r.x) &&
        q.y <= Math.max(p.y, r.y) &&
        q.y >= Math.min(p.y, r.y)
    );
}

function sign(num) {
    return num > 0 ? 1 : num < 0 ? -1 : 0;
}

// check if a polygon diagonal intersects any polygon segments
function intersectsPolygon(a, b) {
    var p = a;
    do {
        if (
            p.i !== a.i &&
            p.next.i !== a.i &&
            p.i !== b.i &&
            p.next.i !== b.i &&
            intersects(p, p.next, a, b)
        )
            return true;
        p = p.next;
    } while (p !== a);

    return false;
}

// check if a polygon diagonal is locally inside the polygon
function locallyInside(a, b) {
    return area(a.prev, a, a.next) < 0
        ? area(a, b, a.next) >= 0 && area(a, a.prev, b) >= 0
        : area(a, b, a.prev) < 0 || area(a, a.next, b) < 0;
}

// check if the middle point of a polygon diagonal is inside the polygon
function middleInside(a, b) {
    var p = a,
        inside = false,
        px = (a.x + b.x) / 2,
        py = (a.y + b.y) / 2;
    do {
        if (
            p.y > py !== p.next.y > py &&
            p.next.y !== p.y &&
            px < ((p.next.x - p.x) * (py - p.y)) / (p.next.y - p.y) + p.x
        )
            inside = !inside;
        p = p.next;
    } while (p !== a);

    return inside;
}

// link two polygon vertices with a bridge; if the vertices belong to the same ring, it splits polygon into two;
// if one belongs to the outer ring and another to a hole, it merges it into a single ring
function splitPolygon(a, b) {
    var a2 = new Node(a.i, a.x, a.y),
        b2 = new Node(b.i, b.x, b.y),
        an = a.next,
        bp = b.prev;

    a.next = b;
    b.prev = a;

    a2.next = an;
    an.prev = a2;

    b2.next = a2;
    a2.prev = b2;

    bp.next = b2;
    b2.prev = bp;

    return b2;
}

// create a node and optionally link it with previous one (in a circular doubly linked list)
function insertNode(i, x, y, last) {
    var p = new Node(i, x, y);

    if (!last) {
        p.prev = p;
        p.next = p;
    } else {
        p.next = last.next;
        p.prev = last;
        last.next.prev = p;
        last.next = p;
    }
    return p;
}

function removeNode(p) {
    p.next.prev = p.prev;
    p.prev.next = p.next;

    if (p.prevZ) p.prevZ.nextZ = p.nextZ;
    if (p.nextZ) p.nextZ.prevZ = p.prevZ;
}

function Node(i, x, y) {
    // vertex index in coordinates array
    this.i = i;

    // vertex coordinates
    this.x = x;
    this.y = y;

    // previous and next vertex nodes in a polygon ring
    this.prev = null;
    this.next = null;

    // z-order curve value
    this.z = null;

    // previous and next nodes in z-order
    this.prevZ = null;
    this.nextZ = null;

    // indicates whether this is a steiner point
    this.steiner = false;
}

// return a percentage difference between the polygon area and its triangulation area;
// used to verify correctness of triangulation
earcut.deviation = function(data, holeIndices, dim, triangles) {
    var hasHoles = holeIndices && holeIndices.length;
    var outerLen = hasHoles ? holeIndices[0] * dim : data.length;

    var polygonArea = Math.abs(signedArea(data, 0, outerLen, dim));
    if (hasHoles) {
        for (var i = 0, len = holeIndices.length; i < len; i++) {
            var start = holeIndices[i] * dim;
            var end = i < len - 1 ? holeIndices[i + 1] * dim : data.length;
            polygonArea -= Math.abs(signedArea(data, start, end, dim));
        }
    }

    var trianglesArea = 0;
    for (i = 0; i < triangles.length; i += 3) {
        var a = triangles[i] * dim;
        var b = triangles[i + 1] * dim;
        var c = triangles[i + 2] * dim;
        trianglesArea += Math.abs(
            (data[a] - data[c]) * (data[b + 1] - data[a + 1]) -
                (data[a] - data[b]) * (data[c + 1] - data[a + 1])
        );
    }

    return polygonArea === 0 && trianglesArea === 0
        ? 0
        : Math.abs((trianglesArea - polygonArea) / polygonArea);
};

function signedArea(data, start, end, dim) {
    var sum = 0;
    for (var i = start, j = end - dim; i < end; i += dim) {
        sum += (data[j] - data[i]) * (data[i + 1] + data[j + 1]);
        j = i;
    }
    return sum;
}

// turn a polygon in a multi-dimensional array form (e.g. as in GeoJSON) into a form Earcut accepts
earcut.flatten = function(data) {
    var dim = data[0][0].length,
        result = { vertices: [], holes: [], dimensions: dim },
        holeIndex = 0;

    for (var i = 0; i < data.length; i++) {
        for (var j = 0; j < data[i].length; j++) {
            for (var d = 0; d < dim; d++) result.vertices.push(data[i][j][d]);
        }
        if (i > 0) {
            holeIndex += data[i - 1].length;
            result.holes.push(holeIndex);
        }
    }
    return result;
};

class ShapeUtils {
    // calculate area of the contour polygon

    static area(contour) {
        const n = contour.length;
        let a = 0.0;

        for (let p = n - 1, q = 0; q < n; p = q++) {
            a += contour[p].x * contour[q].y - contour[q].x * contour[p].y;
        }

        return a * 0.5;
    }

    static isClockWise(pts) {
        return ShapeUtils.area(pts) < 0;
    }

    static triangulateShape(contour, holes) {
        const vertices = []; // flat array of vertices like [ x0,y0, x1,y1, x2,y2, ... ]
        const holeIndices = []; // array of hole indices
        const faces = []; // final array of vertex indices like [ [ a,b,d ], [ b,c,d ] ]

        removeDupEndPts(contour);
        addContour(vertices, contour);

        //

        let holeIndex = contour.length;

        holes.forEach(removeDupEndPts);

        for (let i = 0; i < holes.length; i++) {
            holeIndices.push(holeIndex);
            holeIndex += holes[i].length;
            addContour(vertices, holes[i]);
        }

        //

        const triangles = earcut(vertices, holeIndices);

        //

        for (let i = 0; i < triangles.length; i += 3) {
            faces.push(triangles.slice(i, i + 3));
        }

        return faces;
    }
}

function removeDupEndPts(points) {
    const l = points.length;

    if (l > 2 && points[l - 1].equals(points[0])) {
        points.pop();
    }
}

function addContour(vertices, contour) {
    for (let i = 0; i < contour.length; i++) {
        vertices.push(contour[i].x);
        vertices.push(contour[i].y);
    }
}

class ShapePath {
    constructor() {
        this.type = "ShapePath";

        this.color = new Color();

        this.subPaths = [];
        this.currentPath = null;
    }

    moveTo(x, y) {
        this.currentPath = new Path();
        this.subPaths.push(this.currentPath);
        this.currentPath.moveTo(x, y);

        return this;
    }

    lineTo(x, y) {
        this.currentPath.lineTo(x, y);

        return this;
    }

    quadraticCurveTo(aCPx, aCPy, aX, aY) {
        this.currentPath.quadraticCurveTo(aCPx, aCPy, aX, aY);

        return this;
    }

    bezierCurveTo(aCP1x, aCP1y, aCP2x, aCP2y, aX, aY) {
        this.currentPath.bezierCurveTo(aCP1x, aCP1y, aCP2x, aCP2y, aX, aY);

        return this;
    }

    splineThru(pts) {
        this.currentPath.splineThru(pts);

        return this;
    }

    toShapes(isCCW, noHoles) {
        function toShapesNoHoles(inSubpaths) {
            const shapes = [];

            for (let i = 0, l = inSubpaths.length; i < l; i++) {
                const tmpPath = inSubpaths[i];

                const tmpShape = new Shape();
                tmpShape.curves = tmpPath.curves;

                shapes.push(tmpShape);
            }

            return shapes;
        }

        function isPointInsidePolygon(inPt, inPolygon) {
            const polyLen = inPolygon.length;

            // inPt on polygon contour => immediate success    or
            // toggling of inside/outside at every single! intersection point of an edge
            //  with the horizontal line through inPt, left of inPt
            //  not counting lowerY endpoints of edges and whole edges on that line
            let inside = false;
            for (let p = polyLen - 1, q = 0; q < polyLen; p = q++) {
                let edgeLowPt = inPolygon[p];
                let edgeHighPt = inPolygon[q];

                let edgeDx = edgeHighPt.x - edgeLowPt.x;
                let edgeDy = edgeHighPt.y - edgeLowPt.y;

                if (Math.abs(edgeDy) > Number.EPSILON) {
                    // not parallel
                    if (edgeDy < 0) {
                        edgeLowPt = inPolygon[q];
                        edgeDx = -edgeDx;
                        edgeHighPt = inPolygon[p];
                        edgeDy = -edgeDy;
                    }

                    if (inPt.y < edgeLowPt.y || inPt.y > edgeHighPt.y) continue;

                    if (inPt.y === edgeLowPt.y) {
                        if (inPt.x === edgeLowPt.x) return true; // inPt is on contour ?
                        // continue;				// no intersection or edgeLowPt => doesn't count !!!
                    } else {
                        const perpEdge =
                            edgeDy * (inPt.x - edgeLowPt.x) -
                            edgeDx * (inPt.y - edgeLowPt.y);
                        if (perpEdge === 0) return true; // inPt is on contour ?
                        if (perpEdge < 0) continue;
                        inside = !inside; // true intersection left of inPt
                    }
                } else {
                    // parallel or collinear
                    if (inPt.y !== edgeLowPt.y) continue; // parallel
                    // edge lies on the same horizontal line as inPt
                    if (
                        (edgeHighPt.x <= inPt.x && inPt.x <= edgeLowPt.x) ||
                        (edgeLowPt.x <= inPt.x && inPt.x <= edgeHighPt.x)
                    )
                        return true; // inPt: Point on contour !
                    // continue;
                }
            }

            return inside;
        }

        const isClockWise = ShapeUtils.isClockWise;

        const subPaths = this.subPaths;
        if (subPaths.length === 0) return [];

        if (noHoles === true) return toShapesNoHoles(subPaths);

        let solid, tmpPath, tmpShape;
        const shapes = [];

        if (subPaths.length === 1) {
            tmpPath = subPaths[0];
            tmpShape = new Shape();
            tmpShape.curves = tmpPath.curves;
            shapes.push(tmpShape);
            return shapes;
        }

        let holesFirst = !isClockWise(subPaths[0].getPoints());
        holesFirst = isCCW ? !holesFirst : holesFirst;

        // console.log("Holes first", holesFirst);

        const betterShapeHoles = [];
        const newShapes = [];
        let newShapeHoles = [];
        let mainIdx = 0;
        let tmpPoints;

        newShapes[mainIdx] = undefined;
        newShapeHoles[mainIdx] = [];

        for (let i = 0, l = subPaths.length; i < l; i++) {
            tmpPath = subPaths[i];
            tmpPoints = tmpPath.getPoints();
            solid = isClockWise(tmpPoints);
            solid = isCCW ? !solid : solid;

            if (solid) {
                if (!holesFirst && newShapes[mainIdx]) mainIdx++;

                newShapes[mainIdx] = { s: new Shape(), p: tmpPoints };
                newShapes[mainIdx].s.curves = tmpPath.curves;

                if (holesFirst) mainIdx++;
                newShapeHoles[mainIdx] = [];

                //console.log('cw', i);
            } else {
                newShapeHoles[mainIdx].push({ h: tmpPath, p: tmpPoints[0] });

                //console.log('ccw', i);
            }
        }

        // only Holes? -> probably all Shapes with wrong orientation
        if (!newShapes[0]) return toShapesNoHoles(subPaths);

        if (newShapes.length > 1) {
            let ambiguous = false;
            let toChange = 0;

            for (let sIdx = 0, sLen = newShapes.length; sIdx < sLen; sIdx++) {
                betterShapeHoles[sIdx] = [];
            }

            for (let sIdx = 0, sLen = newShapes.length; sIdx < sLen; sIdx++) {
                const sho = newShapeHoles[sIdx];

                for (let hIdx = 0; hIdx < sho.length; hIdx++) {
                    const ho = sho[hIdx];
                    let hole_unassigned = true;

                    for (let s2Idx = 0; s2Idx < newShapes.length; s2Idx++) {
                        if (isPointInsidePolygon(ho.p, newShapes[s2Idx].p)) {
                            if (sIdx !== s2Idx) toChange++;

                            if (hole_unassigned) {
                                hole_unassigned = false;
                                betterShapeHoles[s2Idx].push(ho);
                            } else {
                                ambiguous = true;
                            }
                        }
                    }

                    if (hole_unassigned) {
                        betterShapeHoles[sIdx].push(ho);
                    }
                }
            }

            if (toChange > 0 && ambiguous === false) {
                newShapeHoles = betterShapeHoles;
            }
        }

        let tmpHoles;

        for (let i = 0, il = newShapes.length; i < il; i++) {
            tmpShape = newShapes[i].s;
            shapes.push(tmpShape);
            tmpHoles = newShapeHoles[i];

            for (let j = 0, jl = tmpHoles.length; j < jl; j++) {
                tmpShape.holes.push(tmpHoles[j].h);
            }
        }

        //console.log("shape", shapes);

        return shapes;
    }
}

// From d3-threeD.js
let d3threeD = {};
const DEGS_TO_RADS = Math.PI / 180;
const DIGIT_0 = 48,
    DIGIT_9 = 57,
    COMMA = 44,
    SPACE = 32,
    PERIOD = 46,
    MINUS = 45;

d3threeD.transformSVGPath = function transformSVGPath(pathStr) {
    const path = new ShapePath();

    let idx = 1,
        activeCmd,
        x = 0,
        y = 0,
        nx = 0,
        ny = 0,
        firstX = null,
        firstY = null,
        x1 = 0,
        x2 = 0,
        y1 = 0,
        y2 = 0,
        rx = 0,
        ry = 0,
        xar = 0,
        laf = 0,
        sf = 0,
        cx,
        cy;

    const len = pathStr.length;

    function eatNum() {
        let sidx,
            c,
            isFloat = false,
            s;

        // eat delims

        while (idx < len) {
            c = pathStr.charCodeAt(idx);

            if (c !== COMMA && c !== SPACE) break;

            idx++;
        }

        if (c === MINUS) {
            sidx = idx++;
        } else {
            sidx = idx;
        }

        // eat number

        while (idx < len) {
            c = pathStr.charCodeAt(idx);

            if (DIGIT_0 <= c && c <= DIGIT_9) {
                idx++;
                continue;
            } else if (c === PERIOD) {
                idx++;
                isFloat = true;
                continue;
            }

            s = pathStr.substring(sidx, idx);
            return isFloat ? parseFloat(s) : parseInt(s);
        }

        s = pathStr.substring(sidx);
        return isFloat ? parseFloat(s) : parseInt(s);
    }

    function nextIsNum() {
        let c;

        // do permanently eat any delims...

        while (idx < len) {
            c = pathStr.charCodeAt(idx);

            if (c !== COMMA && c !== SPACE) break;

            idx++;
        }

        c = pathStr.charCodeAt(idx);
        return c === MINUS || (DIGIT_0 <= c && c <= DIGIT_9);
    }

    let canRepeat;
    activeCmd = pathStr[0];

    while (idx <= len) {
        canRepeat = true;

        switch (activeCmd) {
            // moveto commands, become lineto's if repeated
            case "M":
                x = eatNum();
                y = eatNum();
                path.moveTo(x, y);
                activeCmd = "L";
                firstX = x;
                firstY = y;
                break;

            case "m":
                x += eatNum();
                y += eatNum();
                path.moveTo(x, y);
                activeCmd = "l";
                firstX = x;
                firstY = y;
                break;

            case "Z":
            case "z":
                canRepeat = false;
                if (x !== firstX || y !== firstY) path.lineTo(firstX, firstY);
                break;

            // - lines!
            case "L":
            case "H":
            case "V":
                nx = activeCmd === "V" ? x : eatNum();
                ny = activeCmd === "H" ? y : eatNum();
                path.lineTo(nx, ny);
                x = nx;
                y = ny;
                break;

            case "l":
            case "h":
            case "v":
                nx = activeCmd === "v" ? x : x + eatNum();
                ny = activeCmd === "h" ? y : y + eatNum();
                path.lineTo(nx, ny);
                x = nx;
                y = ny;
                break;

            // - cubic bezier
            case "C":
                x1 = eatNum();
                y1 = eatNum();

            case "S":
                if (activeCmd === "S") {
                    x1 = 2 * x - x2;
                    y1 = 2 * y - y2;
                }

                x2 = eatNum();
                y2 = eatNum();
                nx = eatNum();
                ny = eatNum();
                path.bezierCurveTo(x1, y1, x2, y2, nx, ny);
                x = nx;
                y = ny;
                break;

            case "c":
                x1 = x + eatNum();
                y1 = y + eatNum();

            case "s":
                if (activeCmd === "s") {
                    x1 = 2 * x - x2;
                    y1 = 2 * y - y2;
                }

                x2 = x + eatNum();
                y2 = y + eatNum();
                nx = x + eatNum();
                ny = y + eatNum();
                path.bezierCurveTo(x1, y1, x2, y2, nx, ny);
                x = nx;
                y = ny;
                break;

            // - quadratic bezier
            case "Q":
                x1 = eatNum();
                y1 = eatNum();

            case "T":
                if (activeCmd === "T") {
                    x1 = 2 * x - x1;
                    y1 = 2 * y - y1;
                }

                nx = eatNum();
                ny = eatNum();
                path.quadraticCurveTo(x1, y1, nx, ny);
                x = nx;
                y = ny;
                break;

            case "q":
                x1 = x + eatNum();
                y1 = y + eatNum();

            case "t":
                if (activeCmd === "t") {
                    x1 = 2 * x - x1;
                    y1 = 2 * y - y1;
                }

                nx = x + eatNum();
                ny = y + eatNum();
                path.quadraticCurveTo(x1, y1, nx, ny);
                x = nx;
                y = ny;
                break;

            // - elliptical arc
            case "A":
                rx = eatNum();
                ry = eatNum();
                xar = eatNum() * DEGS_TO_RADS;
                laf = eatNum();
                sf = eatNum();
                nx = eatNum();
                ny = eatNum();
                if (rx !== ry)
                    console.warn(
                        "Forcing elliptical arc to be a circular one:",
                        rx,
                        ry
                    );

                // SVG implementation notes does all the math for us! woo!
                // http://www.w3.org/TR/SVG/implnote.html#ArcImplementationNotes

                // step1, using x1 as x1'

                x1 =
                    (Math.cos(xar) * (x - nx)) / 2 +
                    (Math.sin(xar) * (y - ny)) / 2;
                y1 =
                    (-Math.sin(xar) * (x - nx)) / 2 +
                    (Math.cos(xar) * (y - ny)) / 2;

                // step 2, using x2 as cx'

                let norm = Math.sqrt(
                    (rx * rx * ry * ry -
                        rx * rx * y1 * y1 -
                        ry * ry * x1 * x1) /
                        (rx * rx * y1 * y1 + ry * ry * x1 * x1)
                );

                if (laf === sf) norm = -norm;

                x2 = (norm * rx * y1) / ry;
                y2 = (norm * -ry * x1) / rx;

                // step 3

                cx = Math.cos(xar) * x2 - Math.sin(xar) * y2 + (x + nx) / 2;
                cy = Math.sin(xar) * x2 + Math.cos(xar) * y2 + (y + ny) / 2;

                const u = new THREE.Vector2(1, 0);
                const v = new THREE.Vector2((x1 - x2) / rx, (y1 - y2) / ry);

                let startAng = Math.acos(u.dot(v) / u.length() / v.length());

                if (u.x * v.y - u.y * v.x < 0) startAng = -startAng;

                // we can reuse 'v' from start angle as our 'u' for delta angle
                u.x = (-x1 - x2) / rx;
                u.y = (-y1 - y2) / ry;

                let deltaAng = Math.acos(v.dot(u) / v.length() / u.length());

                // This normalization ends up making our curves fail to triangulate...

                if (v.x * u.y - v.y * u.x < 0) deltaAng = -deltaAng;
                if (!sf && deltaAng > 0) deltaAng -= Math.PI * 2;
                if (sf && deltaAng < 0) deltaAng += Math.PI * 2;

                path.absarc(cx, cy, rx, startAng, startAng + deltaAng, sf);
                x = nx;
                y = ny;
                break;

            default:
                throw new Error("Wrong path command: " + activeCmd);
        }

        // just reissue the command

        if (canRepeat && nextIsNum()) continue;

        activeCmd = pathStr[idx++];
    }

    return path;
};

function global$a(Li, viewer) {
    Shape.createBySvg = function (svg) {
        let shapePath = d3threeD.transformSVGPath(svg);
        let shape = shapePath.toShapes(true);
        return shape;
    };
    return Shape;
}

function global$9(Li, viewer) {
    return Path;
}

function global$8(Li, viewer) {
    const Vertical = {
        center: "CENTER_V",
        bottom: "BOTTOM",
        baseLine: "BASELINE",
        top: "TOP",
    };
    const Horizontal = {
        center: "CENTER_H",
        left: "LEFT",
        right: "RIGHT",
    };
    let collection = null;
    let pickEvent = null;
    /**
     * @description Label 文字标签
     * @constructor
     * @alias graphic.Label
     * @param {Object} options -参数
     * @param {String} [options.url] -图片链接
     * @param {Object} [options.position=null] -点位置
     *   |可选值                                 | 描述               |
     *   |------------------------------------  |----------------    |
     *   |  [[longitude,latitude,height]]       |  经纬度坐标         |
     *   |   [{x:0,y:0,z:0}]                    | 笛卡尔坐标          |
     *   |  [SSmap.Vector3.create(x,y,z)]       | 底层SDK向量对象     |
     * @param {Object} [options.data] -json数据 例：{ name: "深圳会展中心", id: 128939 }
     * @param {Object} options.style -样式
     * @param {String} [options.style.mode=OnTerrain] -定位模式
     *   |可选值       | 描述           |
     *   |--------     |--------       |
     *   |  OnTerrain  | 贴地模式       |
     *   |  Absolute   | 绝对模式       |
     * @param {Number} [options.style.attitude=null] -绝对模式下海拔高度
     * @param {Number} [options.style.width] -图标宽度（默认为加载图标尺寸）
     * @param {Number} [options.style.height] -图标高度（默认为加载图标尺寸）
     * @param {String} [options.style.text] -文本内容
     * @param {Number} [options.style.font=Microsoft YaHei] -字体
     * @param {Number} [options.style.fontSize=12] -字体大小
     * @param {String} [options.style.color] -字体颜色
     * @param {String} [options.style.strokeColor=#000] -字体描边颜色
     * @param {String} [options.style.backgroundColor] -背景颜色
     * @param {Boolean} [options.style.fontBold=false] -文本粗体
     * @param {Boolean} [options.style.fontItalic=false] -文本斜体
     * @param {Boolean} [options.style.fontUnderline=false] -文本下划线
     * @param {Boolean} [options.style.mix=false] -图文混排
     * @param {String} [options.style.align=center] -水平位置
     *   |可选值       | 描述           |
     *   |--------     |--------       |
     *   |  left       | 向左对齐       |
     *   |  center     | 居中对齐       |
     *   |  right      | 向右对齐       |
     * @param {String} [options.style.verticalAlign=bottom] -垂直位置
     *   |可选值       | 描述           |
     *   |--------     |--------       |
     *   |  top        | 顶部对齐       |
     *   |  center     | 居中对齐       |
     *   |  bottom     | 底部对齐       |
     * @param {String} [options.style.textAlign=center] -字体水平位置
     *   |可选值       | 描述           |
     *   |--------     |--------       |
     *   |  left       | 向左对齐       |
     *   |  center     | 居中对齐       |
     *   |  right      | 向右对齐       |
     * @param {String} [options.style.textVertical=top] -字体垂直位置
     *   |可选值       | 描述           |
     *   |--------     |--------       |
     *   |  top        | 顶部对齐       |
     *   |  center     | 居中对齐       |
     *   |  bottom     | 底部对齐       |
     * @param {Array} [options.style.offset=[0,0]] -文本偏移
     *   |可选值       | 描述           |
     *   |--------     |--------       |
     *   |  x          | x轴偏移       |
     *   |  y          | y轴偏移       |
     */
    function Label(options) {
        let defaults = {
            url: "",
            position: null,
            mix: false,
            style: {
                mode: "OnTerrain",
                width: null,
                height: null,
                attitude: null,
                rotation: 0,
                scale: 1,
                text: "",
                font: "Microsoft YaHei",
                fontSize: 12,
                color: "#fff",
                strokeColor: "#000",
                backgroundColor: "#00000001",
                align: "center",
                verticalAlign: "bottom",
                textAlign: "center",
                textVertical: "top",
                offset: [0, 0],
                fontBold: false,
                fontItalic: false,
                fontUnderline: false,
            },
        };
        this.instance = null;
        this._options = mergeOptions(defaults, options);
        initEvents(this);
        if (this._options.position) {
            let position = normalizeVec3Array([this._options.position]);
            this.render(position[0]);
        } else {
            this.init(this._options);
        }
    }
    mixinEvents(Label);
    Label.prototype.init = function () {
        pickClickPoint((point) => {
            console.log(point);
            this.render(point);
        });
    };
    Label.prototype.addProperty = function (key, value) {
        if (this.instance) {
            this.instance.addProperty(key, value);
        }
    };
    Label.prototype.addProperties = function (data) {
        if (this.instance) {
            for (const key in data) {
                if (Object.hasOwnProperty.call(data, key)) {
                    this.addProperty(key, data[key]);
                }
            }
        }
    };
    Label.prototype.render = function (position) {
        let that = this;
        let url = this._options.url;
        if (url) {
            let img = new Image();
            img.src = this._options.url;
            img.onload = function () {
                that.createLabel(position);
            };
        } else {
            this.createLabel(position);
        }
    };
    Label.prototype.createLabel = function (position) {
        let style = this._options.style;
        let data = this._options.data;
        let label = new Li.Label3D();
        this.instance = label;
        label.position = position;
        label.url = this._options.url;
        label.imageWidth = style.width || img.width;
        label.imageHeight = style.height || img.height;
        label.font = style.font;
        label.fontSize = style.fontSize;
        let color = color16ToRgb(style.color);
        label.fontColor = Li.Color.fromRgb(color.r, color.g, color.b, color.a);
        let strokeColor = color16ToRgb(style.strokeColor);
        label.strokeColor = Li.Color.fromRgb(
            strokeColor.r,
            strokeColor.g,
            strokeColor.b,
            strokeColor.a
        );
        let bgColor = color16ToRgb(style.backgroundColor);
        label.background = Li.Color.fromRgb(
            bgColor.r,
            bgColor.g,
            bgColor.b,
            bgColor.a
        );
        label.fontBold = style.fontBold;
        label.fontItalic = style.fontItalic;
        label.fontUnderline = style.fontUnderline;
        let offset = style.offset;
        label.offset = Li.Cartesian2.create(offset[0], offset[1]);
        label.text = style.text;
        label.mix = style.mix;
        label.horizontal = Li.Horizontal[Horizontal[style.align]];
        label.vertical = Li.Vertical[Vertical[style.verticalAlign]];
        label.textHorizontal = Li.Horizontal[Horizontal[style.textAlign]];
        label.textVertical = Li.Vertical[Vertical[style.textVertical]];
        label.setAltitudeMethod(Li.AltitudeMethod[style.mode]);
        if (style.mode == "Absolute" && style.attitude) {
            label.setAltitude(style.attitude);
        }
        // label.setScaleByDistance(Li.Vector4.create(100, 1.0, 10000, 0.5));
        if (data) {
            this.addProperties(data);
        }
        collection = collection
            ? collection
            : Li.BillboardCollection.Instance();
        label.setCollection(collection);
        this.$emit("end");
    };
    /**
     * @description 移除
     */
    Label.prototype.remove = function () {
        if (this.instance) {
            this.instance.delete();
            this.instance = null;
        }
    };
    /**
     * @description 移除所有
     *
     */
    Label.removeAll = function () {
        if (collection) {
            collection.removeAll();
            collection = null;
        }
    };
    /**
     * @description 鼠标拾取点回调
     * @param {Function} cb -返回拾取点数据cb(data)
     */
    Label.pick = function (cb) {
        if (!pickEvent) {
            let canvas = viewer.canvasEl;
            pickEvent = function () {
                let feature = viewer.scene.getFeatureByMouse();
                let bbEntity = Li.Label3D.getSelect(feature);
                if (bbEntity) {
                    if (feature == null || feature == undefined) return;
                    let nameList = feature.propertyNames();
                    let size = nameList.size();
                    let data = {};
                    for (let i = 0; i < size; i++) {
                        let key = nameList.get(i);
                        let value = feature.getProperty(key);
                        data[key] = value;
                    }
                    cb(data);
                }
            };
            canvas.addEventListener("click", pickEvent);
        }
    };
    return Label;
}

/* eslint-disable */
let GeoJSON = {};
GeoJSON.version = "0.5.0";

// Allow user to specify default parameters
GeoJSON.defaults = {
    doThrows: {
        invalidGeometry: false,
    },
};

function InvalidGeometryError() {
    var args = 1 <= arguments.length ? [].slice.call(arguments, 0) : [];
    var item = args.shift();
    var params = args.shift();

    Error.apply(this, args);
    this.message =
        this.message ||
        "Invalid Geometry: " +
            "item: " +
            JSON.stringify(item) +
            ", params: " +
            JSON.stringify(params);
}

InvalidGeometryError.prototype = Error;

GeoJSON.errors = {
    InvalidGeometryError: InvalidGeometryError,
};

//exposing so this can be overriden maybe by geojson-validation or the like
GeoJSON.isGeometryValid = function (geometry) {
    if (!geometry || !Object.keys(geometry).length) return false;

    return (
        !!geometry.type &&
        !!geometry.coordinates &&
        Array.isArray(geometry.coordinates) &&
        !!geometry.coordinates.length
    );
};

// The one and only public function.
// Converts an array of objects into a GeoJSON feature collection
GeoJSON.parse = function (objects, params, callback) {
    var geojson,
        settings = applyDefaults(params, this.defaults),
        propFunc;

    geomAttrs.length = 0; // Reset the list of geometry fields
    setGeom(settings);
    propFunc = getPropFunction(settings);

    if (Array.isArray(objects)) {
        geojson = { type: "FeatureCollection", features: [] };
        objects.forEach(function (item) {
            geojson.features.push(
                getFeature({ item: item, params: settings, propFunc: propFunc })
            );
        });
        addOptionals(geojson, settings);
    } else {
        geojson = getFeature({
            item: objects,
            params: settings,
            propFunc: propFunc,
        });
        addOptionals(geojson, settings);
    }

    if (callback && typeof callback === "function") {
        callback(geojson);
    } else {
        return geojson;
    }
};

// Helper functions
var geoms = [
        "Point",
        "MultiPoint",
        "LineString",
        "MultiLineString",
        "Polygon",
        "MultiPolygon",
        "GeoJSON",
    ],
    geomAttrs = [];

// Adds default settings to user-specified params
// Does not overwrite any settings--only adds defaults
// the the user did not specify
function applyDefaults(params, defaults) {
    var settings = params || {};

    for (var setting in defaults) {
        if (defaults.hasOwnProperty(setting) && !settings[setting]) {
            settings[setting] = defaults[setting];
        }
    }

    return settings;
}

// Adds the optional GeoJSON properties crs and bbox
// if they have been specified
function addOptionals(geojson, settings) {
    if (settings.crs && checkCRS(settings.crs)) {
        if (settings.isPostgres) geojson.geometry.crs = settings.crs;
        else geojson.crs = settings.crs;
    }
    if (settings.bbox) {
        geojson.bbox = settings.bbox;
    }
    if (settings.extraGlobal) {
        geojson.properties = {};
        for (var key in settings.extraGlobal) {
            geojson.properties[key] = settings.extraGlobal[key];
        }
    }
}

// Verify that the structure of CRS object is valid
function checkCRS(crs) {
    if (crs.type === "name") {
        if (crs.properties && crs.properties.name) {
            return true;
        } else {
            throw new Error('Invalid CRS. Properties must contain "name" key');
        }
    } else if (crs.type === "link") {
        if (crs.properties && crs.properties.href && crs.properties.type) {
            return true;
        } else {
            throw new Error(
                'Invalid CRS. Properties must contain "href" and "type" key'
            );
        }
    } else {
        throw new Error('Invald CRS. Type attribute must be "name" or "link"');
    }
}

// Moves the user-specified geometry parameters
// under the `geom` key in param for easier access
function setGeom(params) {
    params.geom = {};

    for (var param in params) {
        if (params.hasOwnProperty(param) && geoms.indexOf(param) !== -1) {
            params.geom[param] = params[param];
            delete params[param];
        }
    }

    setGeomAttrList(params.geom);
}

// Adds fields which contain geometry data
// to geomAttrs. This list is used when adding
// properties to the features so that no geometry
// fields are added the properties key
function setGeomAttrList(params) {
    for (var param in params) {
        if (params.hasOwnProperty(param)) {
            if (typeof params[param] === "string") {
                geomAttrs.push(params[param]);
            } else if (typeof params[param] === "object") {
                // Array of coordinates for Point
                geomAttrs.push(params[param][0]);
                geomAttrs.push(params[param][1]);
            }
        }
    }

    if (geomAttrs.length === 0) {
        throw new Error("No geometry attributes specified");
    }
}

// Creates a feature object to be added
// to the GeoJSON features array
function getFeature(args) {
    var item = args.item,
        params = args.params,
        propFunc = args.propFunc;

    var feature = { type: "Feature" };

    feature.geometry = buildGeom(item, params);
    feature.properties = propFunc.call(item);

    return feature;
}

function isNested(val) {
    return /^.+\..+$/.test(val);
}

// Assembles the `geometry` property
// for the feature output
function buildGeom(item, params) {
    var geom = {};

    for (var gtype in params.geom) {
        var val = params.geom[gtype];

        // Geometry parameter specified as: {Point: 'coords'}
        if (typeof val === "string" && item.hasOwnProperty(val)) {
            if (gtype === "GeoJSON") {
                geom = item[val];
            } else {
                geom.type = gtype;
                geom.coordinates = item[val];
            }
        } else if (typeof val === "object" && !Array.isArray(val)) {
            /* Handle things like:
        Polygon: {
          northeast: ['lat', 'lng'],
          southwest: ['lat', 'lng']
        }
        */
            /*jshint loopfunc: true */
            var points = Object.keys(val).map(function (key) {
                var order = val[key];
                var newItem = item[key];
                return buildGeom(newItem, { geom: { Point: order } });
            });
            geom.type = gtype;
            /*jshint loopfunc: true */
            geom.coordinates = [].concat(
                points.map(function (p) {
                    return p.coordinates;
                })
            );
        }

        // Geometry parameter specified as: {Point: ['lat', 'lng']}
        else if (
            Array.isArray(val) &&
            item.hasOwnProperty(val[0]) &&
            item.hasOwnProperty(val[1])
        ) {
            geom.type = gtype;
            geom.coordinates = [Number(item[val[1]]), Number(item[val[0]])];
        }

        // Geometry parameter specified as: {Point: ['container.lat', 'container.lng']}
        else if (Array.isArray(val) && isNested(val[0]) && isNested(val[1])) {
            var coordinates = [];
            for (var i = 0; i < val.length; i++) {
                // i.e. 0 and 1
                var paths = val[i].split(".");
                var itemClone = item;
                for (var j = 0; j < paths.length; j++) {
                    if (!itemClone.hasOwnProperty(paths[j])) {
                        return false;
                    }
                    itemClone = itemClone[paths[j]]; // Iterate deeper into the object
                }
                coordinates[i] = itemClone;
            }
            geom.type = gtype;
            geom.coordinates = [Number(coordinates[1]), Number(coordinates[0])];
        }
    }

    if (
        params.doThrows &&
        params.doThrows.invalidGeometry &&
        !GeoJSON.isGeometryValid(geom)
    ) {
        throw new InvalidGeometryError(item, params);
    }

    return geom;
}

// Returns the function to be used to
// build the properties object for each feature
function getPropFunction(params) {
    var func;

    if (!params.exclude && !params.include) {
        func = function (properties) {
            for (var attr in this) {
                if (
                    this.hasOwnProperty(attr) &&
                    geomAttrs.indexOf(attr) === -1
                ) {
                    properties[attr] = this[attr];
                }
            }
        };
    } else if (params.include) {
        func = function (properties) {
            params.include.forEach(function (attr) {
                properties[attr] = this[attr];
            }, this);
        };
    } else if (params.exclude) {
        func = function (properties) {
            for (var attr in this) {
                if (
                    this.hasOwnProperty(attr) &&
                    geomAttrs.indexOf(attr) === -1 &&
                    params.exclude.indexOf(attr) === -1
                ) {
                    properties[attr] = this[attr];
                }
            }
        };
    }

    return function () {
        var properties = {};

        func.call(this, properties);

        if (params.extra) {
            addExtra(properties, params.extra);
        }
        return properties;
    };
}

// Adds data contained in the `extra`
// parameter if it has been specified
function addExtra(properties, extra) {
    for (var key in extra) {
        if (extra.hasOwnProperty(key)) {
            properties[key] = extra[key];
        }
    }

    return properties;
}

function global$7(Li, viewer) {
    let pickEvent = null;
    /**
     * @description 大数据撒点
     * @constructor
     * @alias graphic.GeoJsonModel
     * @param {Object} options -参数
     * @param {String} options.iconUrl -图标url
     * @param {String} options.selectedIconUrl -选中图标url
     * @param {Object | Array} options.data -geojson数据
     *   |可选值                                 | 描述                 |
     *   |------------------------------------  |----------------      |
     *   |  {url:'url',keys:['x','y']}          |  数据链接和拾取属性    |
     *   |  [{name:'a',id:1}，{name:'b',id:2}]  |  json数组             |
     * @param {Object} options.style -样式
     * @param {Number} [options.style.attitude=10] -撒点海拔高度
     * @param {Number} [options.style.width] -图标宽度（默认为加载图标尺寸）
     * @param {Number} [options.style.height] -图标高度（默认为加载图标尺寸）
     * @param {Number} [options.style.offsetX=0] -图标X轴偏移值
     * @param {Number} [options.style.offsetY=0] -图标Y轴偏移值
     * @param {Boolean} [options.style.highlight=false] -高亮动画
     */
    function GeoJsonModel(options) {
        let defaults = {
            iconUrl: "",
            selectedIconUrl: "",
            data: null,
            style: {
                width: null,
                height: null,
                offsetX: 0,
                offsetY: 0,
                attitude: 10,
                highlight: false,
                show: true,
            },
        };
        this.instance = null;
        this._options = mergeOptions(defaults, options);
        this.render(this._options.data);
    }
    GeoJsonModel.prototype.render = function (data) {
        let that = this;
        let style = this._options.style;
        let img = new Image();
        img.src = this._options.iconUrl;
        img.onload = function () {
            let instance = new Li.GeoJsonModel();
            instance.iconUrl = that._options.iconUrl;
            instance.selectedIconUrl = that._options.selectedIconUrl;
            instance.height = style.attitude;
            instance.iconSize = Li.Vector2.create(
                style.width || img.width,
                style.height || img.height
            );
            instance.iconOffset = Li.Vector2.create(
                style.offsetX,
                style.offsetY
            );
            instance.show = style.show;
            instance.highlight = style.highlight;
            // instance.lineToGround = true;
            if (Array.isArray(data)) {
                let jsonData = GeoJSON.parse(data, {
                    Point: ["latitude", "longitude"],
                });
                let keys = [];
                data.forEach((item) => {
                    for (const key in item) {
                        if (!keys.includes(key)) {
                            keys.push(key);
                            instance.addField(key);
                        }
                    }
                });
                instance.addString(JSON.stringify(jsonData));
            } else {
                instance.load(data.url);
                data.keys.forEach((key) => {
                    instance.addField(key);
                });
            }
            that.instance = instance;
        };
    };
    /**
     * @description 设置作为基底的3DTileset，创建的图标会漂浮在模型上方
     * @param {Tileset} tileset -SSmap.Tileset创建的实例
     */
    GeoJsonModel.prototype.setBase3DTileset = function (tileset) {
        if (this.instance) {
            this.instance.setBase3DTileset(tileset);
        }
    };
    /**
     * @description 移除
     */
    GeoJsonModel.prototype.remove = function () {
        if (this.instance) {
            this.instance.delete();
            this.instance = null;
        }
    };
    Object.defineProperties(GeoJsonModel.prototype, {
        /**
         * 高亮动画
         * @memberof GeoJsonModel.prototype
         * @type {Boolean}
         */
        highlight: {
            get() {
                return this.instance.highlight;
            },
            set(val) {
                this.instance.highlight = val;
            },
        },
        /**
         * 显示或隐藏
         * @memberof GeoJsonModel.prototype
         * @type {Boolean}
         */
        show: {
            get() {
                return this.instance.show;
            },
            set(val) {
                this.instance.show = val;
            },
        },
    });
    /**
     * @description 鼠标拾取点回调
     * @param {Function} cb -返回拾取点数据cb(data)
     */
    GeoJsonModel.pick = function (cb) {
        if (!pickEvent) {
            let canvas = viewer.canvasEl;
            pickEvent = function () {
                let feature = Li.GeoJsonModel.getSelectedFeature();
                if (feature) {
                    let nameList = feature.propertyNames();
                    let size = nameList.size();
                    let data = {};
                    for (let i = 0; i < size; i++) {
                        let key = nameList.get(i);
                        let value = feature.getProperty(key);
                        data[key] = value;
                    }
                    cb(data);
                }
            };
            canvas.addEventListener("click", pickEvent);
        }
    };
    return GeoJsonModel;
}

function global$6(Li, viewer) {
    /**
     * @description 轨迹动画
     * @constructor
     * @alias analyse.PathEntity
     * @param {Object} options -参数
     * @param {Array} [options.positions=null] -范围点(最少3个点)
     *   |可选值                          | 描述               |
     *   |------------------------       |----------------    |
     *   |  [[longitude,latitude]]       |  经纬度坐标         |
     *   |   [{x:0,y:0,z:0}]             | 笛卡尔坐标          |
     *   |  [SSmap.Vector3.create(x,y,z)]   | 底层SDK向量对象     |
     * @param {Object} [options.style] -样式
     * @param {String} [options.style.color=#007BE6] -几何面颜色
     */
    function PathEntity(options) {
        let defaults = {
            type: "rect",
            style: {
                color: "#007BE6",
                fillAlpha: 0.5,
            },
        };
        this._options = mergeOptions(defaults, options);
        this.instance = null;
        initEvents(this);
        this.initData(this._options);
    }
    mixinEvents(PathEntity);
    PathEntity.prototype.initData = function (options) {
        let positions = options.positions;
        if (positions) {
            let points = normalizeVec3Array(positions);
            this.analyse(points);
        } else {
            this.drawPolygon();
        }
    };
    PathEntity.prototype.drawPolygon = function () {
        let that = this;
        let style = this._options.style;
        let polygon = new SSmap$1.graphic.Polygon({
            type: this._options.type,
            style: {
                mode: "OnTerrain",
                color: style.color,
                alpha: style.fillAlpha,
                fillAlpha: style.fillAlpha,
            },
        });
        polygon.$on("end", function () {
            that.analyse(this.cache.points);
            polygon.remove();
        });
        return polygon;
    };
    PathEntity.prototype.analyse = function (points) {
        let slopeAndAspect = new Li.SlopeAndAspect();
        points.forEach((point) => {
            slopeAndAspect.add(point);
        });
        slopeAndAspect.create();
        this.instance = slopeAndAspect;
        this.$emit("end", this._options.type);
    };
    /**
     * @description 移除
     */
    PathEntity.prototype.remove = function () {
        if (this.instance) {
            this.instance.delete();
            this.instance = null;
        }
    };
    return PathEntity;
}

function global$5(Li, viewer) {
    /**
     * @description 3D弧线
     * @constructor
     * @alias effects.ArcLayer
     * @param {Object} options -参数
     * @param {Array} [options.data=null] -json数组
     *   |对象参数                  | 类型                           | 描述               |
     *   |----------------------    |--------------                 |----------------    |
     *   |  country                 |String                         | 国家名称            |
     *   |  name                    |String                         | 城市名称            |
     *   |  start                   |[longitude,latitude,height]    |  起点坐标           |
     *   |  end                     |[longitude,latitude,height]    |  终点坐标           |
     * @param {String} [options.dataUrl=null] -数据文件url(见示例)
     * @param {Object} [options.style] -样式
     * @param {Number} [options.style.lineWidth=2] -弧线的线宽
     * @param {Number} [options.style.height=1] -弧线的高度系数
     * @param {String} [options.style.startColor=#00ff00] -开始点的颜色
     * @param {String} [options.style.endColor=#0000ff] -结束点的颜色
     * @param {String} [options.style.animation.imgUrl] -线纹理
     * @param {Number} [options.style.animation.repeat] -纹理重复数量
     * @param {Object} [options.style.animation=null] -动画
     * @param {Number} [options.style.animation.duration=3] -动画周期时间(s)
     */
    function ArcLayer(options) {
        let defaults = {
            data: null,
            dataUrl: "",
            style: {
                lineWidth: 2,
                height: 1,
                startColor: "#00ff00",
                endColor: "#0000ff",
                imgUrl: "",
                repeat: null,
                animation: null,
            },
        };
        this._options = mergeOptions(defaults, options);
        this.instance = null;
        this.initData(this._options);
    }
    ArcLayer.prototype.initData = function (options) {
        let data = options.data;
        let dataUrl = options.dataUrl;
        if (data || dataUrl) {
            this.instance = this.render(options);
        } else {
            throw new Error("数据参数data或dataUrl为空！");
        }
    };
    ArcLayer.prototype.render = function (options) {
        let style = options.style;
        let arclayer = new Li.ArcLayer();
        arclayer.lineWidth = style.lineWidth;
        let startColor = color16ToRgb(style.startColor);
        arclayer.setStartColor(
            Li.Color.fromRgb(startColor.r, startColor.g, startColor.b, 255)
        );
        let endColor = color16ToRgb(style.endColor);
        arclayer.setEndColor(
            Li.Color.fromRgb(endColor.r, endColor.g, endColor.b, 255)
        );
        arclayer.height = style.height;
        if (style.imgUrl) {
            arclayer.setImageUrl(style.imgUrl);
            if (style.repeat) {
                arclayer.setRepeat(style.repeat);
            }
        }
        let animation = style.animation;
        if (animation) {
            arclayer.animationRun = true;
            arclayer.animationTimer = animation.duration || 3;
        }
        let data = options.data;
        if (data) {
            data.forEach((item) => {
                arclayer.addString(JSON.stringify(item));
            });
        } else {
            arclayer.setNDJsonFile(options.dataUrl);
        }
        arclayer.create();
        return arclayer;
    };
    /**
     * @description 移除
     */
    ArcLayer.prototype.remove = function () {
        if (this.instance) {
            this.instance.delete();
            this.instance = null;
        }
    };
    return ArcLayer;
}

function global$4(Li, viewer) {
    /**
     * @description 3d地理围栏
     * @constructor
     * @alias affects.GeoFencing
     * @param {Object} options -参数
     * @param {String} [options.type=circle] -几何类型
     *   |可选值       | 描述        |
     *   |--------     |--------    |
     *   |  circle     | 环形       |
     *   |  polygon    | 多边形     |
     * @param {Object | Array} [options.centerPos] -几何类型为环形时中心点
     *   |可选值                          | 描述               |
     *   |------------------------       |----------------    |
     *   |  [longitude,latitude,height]       |  经纬度坐标         |
     *   |   {x:0,y:0,z:0}             | 笛卡尔坐标          |
     *   |  SSmap.Vector3.create(x,y,z)   | 底层SDK向量对象     |
     * @param {Array} [options.positions=null] -范围点(最少3个点)
     *   |可选值                                | 描述               |
     *   |------------------------              |----------------    |
     *   |  [[longitude,latitude,height]]       |  经纬度坐标         |
     *   |   [{x:0,y:0,z:0}]                    | 笛卡尔坐标          |
     *   |  [SSmap.Vector3.create(x,y,z)]       | 底层SDK向量对象     |
     * @param {Object} [options.style] -样式
     * @param {Number} [options.style.radius=100] -几何类型为环形时半径
     * @param {Number} [options.style.segment=100] -几何类型为环形时分割片段
     * @param {Number} [options.style.height=60] -高度
     * @param {String} [options.style.startColor=#00ffff] -顶部渐变颜色
     * @param {String} [options.style.endColor=#0000ff] -底部渐变颜色
     * @param {String} [options.style.imgUrl] -纹理
     * @param {Number} [options.style.scaleX] -纹理X轴缩放
     * @param {Number} [options.style.scaleY] -纹理Y轴缩放
     * @param {Object} [options.style.animation=null] -动画
     * @param {Number} [options.style.animation.duration=2] -动画周期时间(s)
     * @param {Number} [options.style.animation.range=0.5] -光带范围0-1
     * @param {Number} [options.style.animation.direction=horizontal] -纹理动画方向
     *   |可选值            | 描述        |
     *   |--------         |--------     |
     *   |  horizontal     | 水平         |
     *   |  vertical       | 垂直         |
     * @param {Number} [options.style.animation.cw=true] -动画方向默认顺时针
     */
    function GeoFencing(options) {
        let defaults = {
            type: "circle",
            centerPos: null,
            positions: null,
            style: {
                radius: 100,
                height: 60,
                segment: 60,
                startColor: "#00ffff",
                endColor: "#0000ff",
                imageUrl: "",
                scaleX: 1,
                scaleY: 1,
                animation: null,
            },
        };
        this._options = mergeOptions(defaults, options);
        this.instance = null;
        initEvents(this);
        this.initData(this._options);
    }
    mixinEvents(GeoFencing);
    GeoFencing.prototype.initData = function (options) {
        let positions = options.positions;
        let style = options.style;
        if (options.type == "polygon" && positions) {
            let points = normalizeVec3Array(positions);
            let pointArr = new Li.Cartesian3Vector();
            points.forEach((point) => {
                pointArr.push_back(point.toCartesian3());
            });
            this.render(pointArr);
        } else if (options.centerPos) {
            let points = normalizeVec3Array([options.centerPos]);
            let pointArr = Li.GisUtil.computeShape2GeodeticSurface(
                style.radius,
                style.height,
                points[0]
            );
            this.render(pointArr);
        } else {
            throw new Error("位置参数centerPos或positions为空！");
        }
    };
    GeoFencing.prototype.render = function (pointArr) {
        let style = this._options.style;
        let geoFencing = new Li.GeoFencing();
        geoFencing.setOuter(pointArr); //设置外轮廓坐标列表, 可以根据需要传入一组坐标列表
        geoFencing.extrudeHeight = style.height; //拉伸高度
        let startColor = color16ToRgb(style.startColor);
        let endColor = color16ToRgb(style.endColor);
        geoFencing.setColorRamp(
            Li.Color.fromRgb(startColor.r, startColor.g, startColor.b, 255),
            Li.Color.fromRgb(endColor.r, endColor.g, endColor.b, 255)
        ); //渐变颜色(顶部到底部渐变)

        if (style.imgUrl) {
            geoFencing.url = style.imgUrl;
            geoFencing.textureScale = Li.Vector2.create(
                style.scaleX,
                style.scaleY
            ); //纹理缩放
        }
        let animation = style.animation;
        if (animation) {
            geoFencing.setAnimationRun(true); //是否有动画
            geoFencing.setRange(animation.range || 0.5); //光带 范围
            geoFencing.setAnimationTimer(animation.duration || 2); //光带动画周期时间 2s
            geoFencing.animationDirection =
                animation.direction == "vertical"
                    ? Li.AnimatingUVCoords.UDirection
                    : Li.AnimatingUVCoords.VDirection; //UDirection(S纹理动画) : 水平方向, VDirection(T纹理动画):垂直方向
            geoFencing.cw = animation.cw || true; //动画方向 S纹理动画-正转,反转. T纹理动画-从下到上, 从上到下
        }

        geoFencing.create();
    };
    /**
     * @description 移除
     */
    GeoFencing.prototype.remove = function () {
        if (this.instance) {
            this.instance.delete();
            this.instance = null;
        }
    };
    return GeoFencing;
}

function global$3(Li, viewer) {
    /**
     * @description 相机工具类，例如：相机的定位旋转-环视、定点旋转-围绕、转正北、二三维切换
     * @constructor
     * @alias CameraUtil
     */
    function CameraUtil() {
        this._nowdegrees = 0;
        this._rotatespeed = 0.01;
    }
    Object.defineProperties(CameraUtil.prototype, {
        /**
         * 旋转速度.{@link Rotate}方法创建后专用
         * @memberof CameraUtil.prototype
         * @type {Number}
         */
        rotatespeed: {
            get() {
                return this._rotatespeed;
            },
            set(val) {
                this._rotatespeed = val;
            },
        },
    });
    /**
     * @description 相机操作-旋转
     * @param {Object} options -参数
     * @param {String} options.type -旋转类型，'surround'为围绕，'around'为环视
     * @param {Number} options.speed -旋转速度
     * @param {Number} [options.distance] -距离参数点距离，{@link surround}类型使用
     * @param {Array} [options.point] -旋转参考坐标，'surround'-{@link 非必填}，'around'-{@link 必填}
     * @param {Number} [options.point.lon] -参考坐标-经度
     * @param {Number} [options.point.lat] -参考坐标-纬度
     * @param {Number} [options.point.alt] -参考坐标-海拔
     * @param {Boolean} [options.refshow] -是否显示参考坐标点，默认不显示
     */
    CameraUtil.prototype.Rotate = function (options) {
        options = options || {};
        //帧动画组件
        this.frameAction = new Li.FrameAction();
        let point = null;
        this.rotatespeed = options.speed || 0.01;
        if (options.point) {
            point = Li.Cartesian3.fromDegrees(
                options.point.lon,
                options.point.lat,
                options.point.alt
            ).toVector3();
        } else {
            if (options.type === "surround") {
                point = getScreenCenter();
            }
        }
        if (options.refshow) {
            this._drawPoint("camera", point);
        }
        //累计的时间
        let that = this;
        if (!point) {
            console.error("参数报错", "point无坐标");
            return;
        }
        let destination = point.toCartesian3();
        let cameraController = viewer.scene.mainCamera.cameraController();
        let initialHeading = cameraController.heading; //相机当前heading
        let distance =
            options.distance || cameraController.positionWC.distance(point); //当前视角到中心点距离
        if (options.type === "surround") {
            distance = distance <= 10 ? 100 : distance;
        }
        //cameraController.moveBackward(distance); //空间距离
        this.frameAction.onTriggered(function (deltaSeconds) {
            that._nowdegrees += that.rotatespeed;
            //1毫秒旋转多少弧度
            let radians = (Math.PI / 180) * that._nowdegrees;
            let nowheading = radians + initialHeading;
            cameraController.setView(
                destination,
                nowheading,
                cameraController.pitch,
                cameraController.roll
            );
            if (options.type === "surround") {
                cameraController.moveBackward(distance); //空间距离
            }
        });
        viewer.scene.rootEntity.addComponent(this.frameAction);
    };
    /**
     * @description 相机操作-停止旋转
     */
    CameraUtil.prototype.removeRotate = function () {
        if (this.frameAction) {
            this.frameAction.delete();
            this.frameAction = null;
            this._nowdegrees = 0;
            this.bbEntity.delete();
            this.bbEntity = null;
        }
    };
    /**
     * @description 切换二维模式
     */
    CameraUtil.prototype.tomapMode2D = function () {
        let cameraController =
            window.viewer.scene.mainCamera.cameraController();
        if (cameraController.enableTilt) {
            cameraController.flyToCartographic(
                cameraController.positionCartographic,
                1.5, //持续时间
                0, //heading
                -90, //pitch
                0 //roll
            );
            cameraController.enableTilt = false;
        }
    };
    /**
     * @description 切换三维模式
     */
    CameraUtil.prototype.tomapMode3D = function () {
        let cameraController =
            window.viewer.scene.mainCamera.cameraController();
        if (!cameraController.enableTilt) {
            cameraController.flyToCartographic(
                cameraController.positionCartographic,
                1.5, //持续时间
                0, //heading
                -45, //pitch
                0 //roll
            );
            cameraController.enableTilt = true;
        }
    };

    /**
     * @description 正北模式
     */
    CameraUtil.prototype.toTrueNorth = function () {
        let cameraController =
            window.viewer.scene.mainCamera.cameraController();
        var currentPosition = cameraController.positionCartographic;
        var currentPitch = cameraController.pitch; //返回值为弧度
        cameraController.flyToCartographic(
            currentPosition,
            1.5, //持续时间
            0, //heading
            (currentPitch * 180) / Math.PI, //pitch
            0 //roll
        );
    };
    //临时添加的
    CameraUtil.prototype._drawPoint = function (name, point) {
        var billboards = Li.BillboardCollection.Instance();
        billboards.removeAll();
        this.bbEntity = new Li.BillboardEntity();
        this.bbEntity.position = point;
        this.bbEntity.url = SSmap.$baseUrl + "/assets/images/circle.png";
        this.bbEntity.vertical = true;
        this.bbEntity.imageWidth = 10;
        this.bbEntity.imageHeight = 10;
        if (name) {
            this.bbEntity.objectName = name;
        }
        this.bbEntity.setCollection(Li.BillboardCollection.Instance());
    };
    return CameraUtil;
}
//darren-♏

function CameraEvent(cviewer) {
    this._viewer = cviewer || viewer;
    this._cameraEventWaitTime = 500; //
    this._cameraStartFired = false;
    if (this._cameraClone) {
        //复制前必须加删除之前的相机对象
        this._cameraClone.delete();
        this._cameraClone = null;
    }
    this._cameraClone = this.clone(this._viewer.scene.mainCamera);
    this._cameraMovedTime = undefined;
    let that = this;
    this._frameAction = this._viewer.addEventListener("update", function () {
        that._checkForCameraUpdates(that._viewer.scene);
    });
    //this.
}
//返回两个坐标xyz(绝对值)中最大的值
CameraEvent.prototype._maxComponent = function (a, b) {
    var x = Math.max(Math.abs(a.x), Math.abs(b.x));
    var y = Math.max(Math.abs(a.y), Math.abs(b.y));
    var z = Math.max(Math.abs(a.z), Math.abs(b.z));
    return Math.max(Math.max(x, y), z);
};
//
CameraEvent.prototype._cameraEqual = function (camera0, camera1, epsilon) {
    let maxComponent = this._maxComponent(
        camera0.cameraController().positionWC,
        camera1.cameraController.positionWC
    );
    var scalar = 1 / Math.max(1, maxComponent);
    let scratchPosition0 = multiplyByScalarToCartesian3(
        camera0.cameraController().positionWC,
        scalar
    );
    let scratchPosition1 = multiplyByScalarToCartesian3(
        camera1.cameraController.positionWC,
        scalar
    );
    let cameraposiotn = equalsEpsilonToCartesian3(
        scratchPosition0,
        scratchPosition1,
        epsilon
    );
    let cameradirection = equalsEpsilonToCartesian3(
        camera0.cameraController().directionWC, //directionWC
        camera1.cameraController.directionWC, //directionWC
        epsilon
    );
    let cameraup = equalsEpsilonToCartesian3(
        camera0.cameraController().upWC, //directionWC
        camera1.cameraController.upWC, //directionWC
        epsilon
    );
    let cameraright = equalsEpsilonToCartesian3(
        camera0.cameraController().rightWC, //directionWC
        camera1.cameraController.rightWC, //directionWC
        epsilon
    );
    let cameratransform = equalsEpsilonToMatrix4(
        camera0.transform.matrix,
        camera1._transformmatrix,
        epsilon
    );
    //let camerafrustum = equalsEpsilonTofrustum()
    let r =
        cameraposiotn &&
        cameradirection &&
        cameraup &&
        cameraright &&
        cameratransform;
    return r;
};
//检查相机更新
CameraEvent.prototype._checkForCameraUpdates = function (scene) {
    let newscene = scene || viewer.scene;
    var camera = newscene.mainCamera;
    var cameraClone = this._cameraClone;
    //0.000000000000001 容差值
    if (!this._cameraEqual(camera, cameraClone, 0.000000000000001)) {
        if (!this._cameraStartFired) {
            if (this._moveStartraiseEvent) {
                this._moveStartraiseEvent(); //相机移动前
                console.log("相机移动前");
            }
            this._cameraStartFired = true;
        }
        this._cameraMovedTime = getTimestamp();
        if (this._cameraClone) {
            //复制前必须加删除之前的相机对象
            this._cameraClone.delete();
            this._cameraClone = null;
        }
        this._cameraClone = this.clone(camera); //复制

        return true;
    }
    let time = getTimestamp() - this._cameraMovedTime;
    if (this._cameraStartFired && time > this._cameraEventWaitTime) {
        if (this._moveEndraiseEvent) {
            this._moveEndraiseEvent(); //相机移动后
            console.log("相机移动后");
        }
        this._cameraStartFired = false;
    }

    return false;
};
CameraEvent.prototype.moveStart = function (fn) {
    if (typeof fn === "function") {
        this._moveStartraiseEvent = fn;
    } else {
        console.error("RuntimeError", "Argument is not a function");
    }
};
CameraEvent.prototype.moveEnd = function (fn) {
    if (typeof fn === "function") {
        this._moveEndraiseEvent = fn;
    } else {
        console.error("RuntimeError", "Argument is not a function");
    }
};
CameraEvent.prototype.clone = function (mainCamera) {
    let Rcamera = new Li.Camera();
    Rcamera.cameraController = mainCamera.cameraController();
    Rcamera.aperture = mainCamera.aperture;
    Rcamera.shutterSpeed = mainCamera.shutterSpeed;
    Rcamera.sensitivity = mainCamera.sensitivity;
    Rcamera.nearPlane = mainCamera.nearPlane;
    Rcamera.farPlane = mainCamera.farPlane;
    Rcamera.fov = mainCamera.fov;
    Rcamera.aspectRatio = mainCamera.aspectRatio;
    Rcamera.left = mainCamera.left;
    Rcamera.right = mainCamera.right;
    Rcamera.bottom = mainCamera.bottom;
    Rcamera.top = mainCamera.top;
    Rcamera._transformmatrix = mainCamera.transform.matrix;
    return Rcamera;
};

//相机方法
function global$2(Li, viewer) {
    function Camera() {
        new CameraEvent(viewer);
    }

    return Camera;
}

function global$1(Li, viewer) {
    function CameraRoam() {
        this._EntityCollection = []; //点线实体集合
        this.roampoint = {}; //漫游点
        //场景参数
        this._scene = viewer.scene;
        this._mainCamera = this._scene.mainCamera;
        this._nowindex = 1; //当前漫游站点索引
        this._standoffdistance = 50; //每个点之间相隔多少米
        this.isloop = false;
        this.Eventtype = {
            roamstart: 0, //开始漫游回调事件
            roamstop: 1, //停止漫游回调事件
            roampause: 2, //暂停漫游回调事件
            roamcontinue: 3, //继续漫游回调事件
        };
    }
    Object.defineProperties(CameraRoam.prototype, {
        roaming: {
            get() {
                if (this._frameeventlistenin) {
                    return true;
                } else {
                    return false;
                }
            },
        },
        id: {
            get() {
                return this._id;
            },
            set(id) {
                this._id = id;
            },
        },
        EntityALLObject: {
            get() {
                let l = [];
                this._EntityCollection.forEach((e) => {
                    l.push({
                        id: e.id,
                        attr: e.attr,
                    });
                });
                return l;
            },
        },
    });
    //根据id更新实体属性
    CameraRoam.prototype.updateattrById = function (id, options) {
        if (id) {
            this._EntityCollection.forEach((e) => {
                if (e.id === id) {
                    e.attr = options;
                    this._showLine(e.Line, options.showrouteLine);
                    this._showsitepoint(e.point, options.showBillboard);
                    this.isloop =
                        options.isloop == undefined ? false : options.isloop;
                }
            });
        }
    };
    //根据id更新站点属性
    CameraRoam.prototype.setsitedataBysiteid = function (id, options) {
        if (this._frameeventlistenin) {
            //漫游中，更新失败
            return;
        }
        let points = this.roampoint[options.id];
        this.id = options.id;
        let entityobject = null;
        for (let i = 0; i < points.length; i++) {
            let point = points[i];
            if (point.siteid === id) {
                points[i] = options;
                //重新生成点
                entityobject = this.getsiteBysiteid(point.siteid);
                if (entityobject) {
                    this._removesite(entityobject);
                    this._createPoint(entityobject, options);
                }
            }
        }
        if (entityobject) {
            //重新生成线
            this._createrouteline(entityobject, points);
        }
    };
    //创建站点
    CameraRoam.prototype._createPoint = function (entityobject, options) {
        //点
        let positionpoint = Li.Cartesian3.fromDegrees(
            Number(options.lon),
            Number(options.lat),
            Number(options.alt)
        ).toVector3();
        let opt = {
            id: this.id,
            position: positionpoint,
            text: entityobject.entity.attr.text,
            Name: entityobject.entity.attr.Name,
            fontSize: entityobject.entity.attr.fontSize, //文字大小
            fontColor: entityobject.entity.attr.fontColor, //字体颜色
            url: entityobject.entity.attr.url, //图标路径
            imageWidth: entityobject.entity.attr.imageWidth, //图标宽度
            imageHeight: entityobject.entity.attr.imageHeight, //图标长度
            scale: entityobject.entity.attr.scale, //label 整体比例
            background: entityobject.entity.attr.background, //背景颜色
            offset: entityobject.entity.attr.offset, //偏移量
            show:
                entityobject.entity.attr.show == undefined
                    ? false
                    : entityobject.entity.attr.show,
        };
        let labelEntity = this._addlabelPoint(opt);
        this._EntityCollection[entityobject.layerindex].point[
            entityobject.index
        ] = labelEntity;
    };
    //重新创建线
    CameraRoam.prototype._createrouteline = function (entityobject, points) {
        //删除
        this._EntityCollection[entityobject.layerindex].Line.delete();
        let attr = this._EntityCollection[entityobject.layerindex].Line.attr;
        this._EntityCollection[entityobject.layerindex].Line = null;
        let polylinepoints = [];
        for (let i = 0; i < points.length; i++) {
            let point = points[i];
            let positionpoint = Li.Cartesian3.fromDegrees(
                Number(point.lon),
                Number(point.lat),
                Number(point.alt)
            ).toVector3();
            polylinepoints.push(positionpoint);
        }
        if (polylinepoints.length > 0) {
            var lineopt = {
                id: this.id,
                width: attr.width, //线宽
                alpha: attr.alpha, //线的透明度
                pointArr: polylinepoints, //坐标点
                color: attr.color, //线的颜色
                altitudemethod: attr.altitudemethod, //海拔高度模式
                name: attr.name, //名称
                show: attr.show == undefined ? false : attr.show,
            };
            var lineentity = this._addLineEntity(lineopt);
            this._EntityCollection[entityobject.layerindex].Line = lineentity;
        }
    };
    //事件注册
    CameraRoam.prototype.on = function (type, fn) {
        switch (type) {
            case 0:
                this._startroamevent = fn;
                break;
            case 1:
                this._stoproamevent = fn;
                break;
            case 2:
                this._pauseroamevent = fn;
                break;
            case 3:
                this._continueroamevent = fn;
                break;
        }
    };
    //移除站点
    CameraRoam.prototype._removesite = function (entityobject) {
        if (entityobject) {
            entityobject.entity.delete();
            this._EntityCollection[entityobject.layerindex].point[
                entityobject.index
            ] = null;
        }
    };
    //根据站点id查找站点
    CameraRoam.prototype.getsiteBysiteid = function (siteid, id) {
        id = id || this.id;
        if (!id) {
            return;
        }
        let opt = null;
        for (let i = 0; i < this._EntityCollection.length; i++) {
            let e = this._EntityCollection[i];
            if (e.id === id) {
                e.point.forEach((s, index) => {
                    if (s.objectName === siteid) {
                        opt = {
                            entity: s,
                            index: index,
                            layerindex: i,
                        };
                        return;
                    }
                });
            }
        }
        return opt;
    };
    //隐藏漫游路线
    CameraRoam.prototype._showLine = function (Lineentity, show) {
        if (Lineentity.enabled === show) {
            return null;
        }
        Lineentity.enabled = show == undefined ? false : show;
    };
    //隐藏漫游站点
    CameraRoam.prototype._showsitepoint = function (Pointentitys, show) {
        for (let i = 0; i < Pointentitys.length; i++) {
            let Pointentity = Pointentitys[i];
            if (Pointentity.enabled === show) {
                return null;
            }
            Pointentity.enabled = show == undefined ? false : show;
        }
    };
    //开启播放
    CameraRoam.prototype.startplay = function () {
        let scene = window.viewer.scene;
        let mainCamera = scene.mainCamera;
        if (
            (this._frameeventlistenin == undefined ||
                this._frameeventlistenin == null) &&
            !this._FramerateEvent
        ) {
            //开始漫游事件
            if (this._startroamevent) {
                this._startroamevent();
            }
            //重新生成漫游路线
            let points = this.roampoint[this._id];
            let stoppoint = this._computebezierPath(points);
            if (!stoppoint) {
                return null;
            }
            let speed = null; //当前速度
            var twoduration = 0; //两点的飞行时间
            var flyaccumutime = 0; //两点之间的累计时间
            this._frameeventlistenin = new Li.FrameAction();
            let that = this;
            if (!that._FramerateEvent) {
                that._FramerateEvent = function (ds) {
                    //初始漫游
                    speed = Number(stoppoint[that._nowindex - 1].speed);
                    if (that._startPoint == null && that._endPoint == null) {
                        that._startPoint = stoppoint[that._nowindex - 1];
                        that._endPoint = stoppoint[that._nowindex];
                        // 计算两点之间的距离
                        let distance = Li.Cartesian3.distance(
                            that._startPoint.position.toCartesian3(),
                            that._endPoint.position.toCartesian3()
                        );
                        // 计算两点之间的飞行持续时间
                        twoduration = distance / speed;
                    }
                    flyaccumutime += ds;
                    // 两点之间的飞行时间(归一化)
                    let endTime =
                        that._endPoint.index && that._endPoint.index > 0
                            ? that._endPoint.index
                            : 1;
                    //当前时间
                    let currentTime = that._setFlyDuration(
                        flyaccumutime,
                        twoduration
                    );
                    if (currentTime >= endTime) {
                        flyaccumutime = 0;
                        that._nowindex++;
                        twoduration = 0;
                        // 漫游结束
                        if (that._nowindex >= stoppoint.length) {
                            if (
                                that._frameeventlistenin != undefined &&
                                that._frameeventlistenin != null
                            ) {
                                that.stopplay();
                                //console.log("停止漫游");
                                //循环漫游
                                if (that.isloop) {
                                    that.startplay();
                                }
                            }
                        } else {
                            let lerpposition = that._lerpToTime(
                                that._startPoint.position,
                                that._endPoint.position,
                                currentTime
                            );
                            let cartographic = lerpposition
                                .toCartesian3()
                                .toCartographic();
                            mainCamera.transform.position =
                                cartographic.toVector3();
                            //console.log("转弯时的执行");
                        }
                        that._startPoint = null;
                        that._endPoint = null;
                    } else {
                        let lerpposition = that._lerpToTime(
                            that._startPoint.position,
                            that._endPoint.position,
                            currentTime
                        );
                        let cartographic = lerpposition
                            .toCartesian3()
                            .toCartographic();
                        mainCamera.transform.position =
                            cartographic.toVector3();
                        mainCamera.transform.lookAt(that._endPoint.position);
                        //console.log("直线漫游");
                    }
                };
            }
            this._frameeventlistenin.onTriggered(that._FramerateEvent);
            this._scene.rootEntity.addComponent(this._frameeventlistenin);
        } else if (this._FramerateEvent) {
            //继续
            if (this._continueroamevent) {
                this._continueroamevent();
            }
            this._frameeventlistenin = new Li.FrameAction();
            this._frameeventlistenin.onTriggered(this._FramerateEvent);
            this._scene.rootEntity.addComponent(this._frameeventlistenin);
        }
    };
    //暂停播放
    CameraRoam.prototype.pauseplay = function () {
        // 删除每帧监听
        if (this._frameeventlistenin) {
            this._frameeventlistenin.delete();
            this._frameeventlistenin = null;
        }
        //暂停
        if (this._pauseroamevent) {
            this._pauseroamevent();
        }
    };
    //停止播放
    CameraRoam.prototype.stopplay = function () {
        // 删除每帧监听
        if (this._frameeventlistenin) {
            this._nowindex = 1; //恢复到第一个站点
            this._frameeventlistenin.delete();
            this._frameeventlistenin = null;
            delete this._FramerateEvent;
            this._FramerateEvent = null;
        }
        //暂停
        if (this._stoproamevent) {
            this._stoproamevent();
        }
    };
    //移除漫游路线
    CameraRoam.prototype.removeRoamById = function (id) {
        id = id || this._id;
        if (id) {
            this.stopplay();
            delete this.roampoint[id]; //漫游点移除
            this._EntityCollection.forEach((e, index) => {
                if (e.id === id) {
                    e.Line.delete(); //移除漫游线
                    e.point.forEach((p) => {
                        p.delete();
                    });
                    this._EntityCollection.splice(index, 1);
                    return;
                }
            });
        }
    };
    //根据站点 移除站点坐标
    CameraRoam.prototype.removesiteById = function (id) {
        if (this.id) {
            this.roampoint[this.id].forEach((e, index) => {
                if (e.siteid === id) {
                    let entityobject = this.getsiteBysiteid(id);
                    if (entityobject) {
                        entityobject.entity.delete();
                        this._EntityCollection[
                            entityobject.layerindex
                        ].point.splice(entityobject.index, 1);
                        this.roampoint[this.id].splice(index, 1);
                        this._createrouteline(
                            entityobject,
                            this.roampoint[this.id]
                        );
                    }
                    return;
                }
            });
        }
    };
    //根据id获取漫游图层信息
    CameraRoam.prototype.getRoamLayerById = function (id) {
        let attropt = null;
        this._EntityCollection.forEach((e) => {
            if (e.id === id) {
                attropt = e.attr;
            }
        });
        this.id = id;
        return attropt;
    };
    //================================临时方法=================
    //生成漫游路线
    CameraRoam.prototype.createroamLine = function (options, event) {
        if (this._drawLineentity) {
            this._drawLineentity.delete();
            this._drawLineentity = null;
        }
        options = options || {};
        this._id = options.id || createGuid(); //当前id
        this.isloop = options.isloop == undefined ? false : options.isloop; //循环否
        this._roampoints = options.points;
        //this.removeEntity();
        //移除实体
        let pointentities = []; //Label数组
        this._polylinepoints = [];
        let pointList = [];
        for (var i = 0; i < options.points.length; i++) {
            let point = options.points[i];
            let positionpoint = Li.Cartesian3.fromDegrees(
                point[0],
                point[1],
                point[2]
            ).toVector3();
            this._polylinepoints.push(positionpoint);
            //点
            let opt = {
                id: this._id,
                position: positionpoint,
                text: "站点" + (i + 1),
                Name: "site" + i,
                fontSize: 10, //文字大小
                fontColor: Li.Color.fromRgb(255, 255, 255, 255), //字体颜色
                url: "/assets/images/redpoint.png", //图标路径
                imageWidth: 16, //图标宽度
                imageHeight: 22, //图标长度
                scale: 1.0, //label 整体比例
                background: Li.Color.fromRgb(0, 0, 0, 128), //背景颜色
                offset: Li.Cartesian2.create(0, 0), //偏移量
                show:
                    options.showBillboard == undefined
                        ? false
                        : options.showBillboard,
            };
            let labelEntity = this._addlabelPoint(opt);
            pointentities.push(labelEntity);
            let option = {
                id: this._id,
                siteid: "site" + i,
                name: "站点" + (i + 1),
                lon: point[0],
                lat: point[1],
                alt: point[2],
            };
            if (options.points.length - 1 != i) {
                option.speed = 100; //默认100
            }
            pointList.push(option);
        }
        this.roampoint[this._id] = pointList;
        //线
        var lineopt = {
            id: this._id,
            width: 5, //线宽
            alpha: 1, //线的透明度
            pointArr: this._polylinepoints, //坐标点
            color: Li.Color.fromRgb(211, 25, 222, 255), //线的颜色
            altitudemethod: Li.AltitudeMethod.Absolute, //海拔高度模式
            name: "line-roam", //名称
            show:
                options.showrouteLine == undefined
                    ? false
                    : options.showrouteLine,
        };
        var lineentity = this._addLineEntity(lineopt);
        let newoption = {
            pointLists: pointList,
            name: options.name,
            layerid: this._id,
            routeremarks: options.routeremarks || "",
            isloop: options.isloop == undefined ? false : options.isloop,
            showrouteLine:
                options.showrouteLine == undefined
                    ? false
                    : options.showrouteLine,
            showBillboard:
                options.showBillboard == undefined
                    ? false
                    : options.showBillboard,
        };
        this._EntityCollection.push({
            id: this._id,
            Line: lineentity,
            point: pointentities,
            attr: newoption,
        });
        if (event) {
            event(newoption);
        }
    };
    //生成点 临时
    CameraRoam.prototype._addlabelPoint = function (opt) {
        var label3d = new Li.Label3D();
        label3d.position = opt.position;
        if (opt.text != "" && opt.text != undefined) {
            label3d.text = opt.text;
        }
        label3d.fontColor = opt.fontColor;
        label3d.fontSize = opt.fontSize;
        if (opt.url) {
            label3d.url = SSmap.$baseUrl + opt.url; //
        }
        if (opt.imageWidth) {
            label3d.imageWidth = opt.imageWidth;
        }
        if (opt.imageHeight) {
            label3d.imageHeight = opt.imageHeight;
        }
        if (opt.background) {
            label3d.background = opt.background;
        }
        if (opt.strokeColor) {
            label3d.strokeColor = opt.strokeColor; //描边颜色，黑边
        }
        if (opt.altitude) {
            label3d.setAltitude(opt.altitude);
            label3d.setAltitudeMethod(Li.AltitudeMethod.Absolute);
        } else {
            label3d.setAltitudeMethod(Li.AltitudeMethod.OnTerrain);
        }
        if (opt.offset) {
            //偏移量
            label3d.offset = opt.offset;
        }
        //显示否
        label3d.enabled = opt.show;

        if (opt.scaleByDistance) {
            //缩放比
            label3d.setScaleByDistance(opt.scaleByDistance);
        }
        if (opt.translucencyByDistance) {
            //缩放控制透明度
            label3d.setTranslucencyByDistance(opt.translucencyByDistance);
        }
        label3d.scale = opt.scale == undefined ? 1.0 : opt.scale;
        if (opt.Name) {
            label3d.objectName = opt.Name || "";
        }
        label3d.setLineToGround(false); //牵引线
        label3d.addProperty("id", opt.name || "label3d");
        label3d.addProperty("attr", JSON.stringify(opt));
        label3d.setCollection(Li.BillboardCollection.Instance()); //设置到Label3D集合中
        label3d.attr = opt;
        return label3d;
    };
    //生成线 临时
    CameraRoam.prototype._addLineEntity = function (opt) {
        var polyline = new Li.Polyline3D();
        polyline.setWidth(opt.width);
        polyline.alpha = opt.alpha >= 1 ? 0.99 : opt.alpha; //alpha透明度不能设置为1.0
        for (var i = 0; i < opt.pointArr.length; i++) {
            polyline.addPoint(opt.pointArr[i]);
        }
        polyline.color = opt.color;
        polyline.depthTest = opt.depthTest == undefined ? true : opt.depthTest; //是否关闭深度检测
        if (opt.altitudemethod) {
            polyline.setAltitudeMethod(opt.altitudemethod);
        }

        //polyline.setSceneMode(Li.TextureProjectionSceneMode.WholeScene);
        if (opt.altitude) {
            polyline.setAltitude(opt.altitude);
        }
        polyline.setMinDistance(5.0); //设定插点的最小距离
        polyline.setGlowMaterial(opt.glow == undefined ? false : opt.glow); //发光
        if (opt.imgurl) {
            polyline.setImageUrl(SSmap.$baseUrl + opt.imgurl);
            polyline.setRepeat(opt.repeat || 20); //纹理动画的重复数量(箭头一类动画)
        }
        if (opt.flowanim) {
            polyline.animationRun = opt.flowanim; //动画
            polyline.animationTimer = opt.flowanimspeed || 3000; //动画 3000ms
        }
        polyline.name = opt.name;
        if (opt.id) {
            polyline.id = opt.id;
            polyline.addProperty("id", opt.id); //拾取 属性设置
            polyline.addProperty("name", opt.name);
        }
        //显示否
        polyline.enabled = opt.show;
        polyline.draw();
        polyline.end();
        polyline.attr = opt;
        return polyline;
    };
    //移除所有
    CameraRoam.prototype.removeEntity = function () {
        for (var i = 0; i < this._EntityCollection.length; i++) {
            let entity = this._EntityCollection[i];
            if (entity) {
                entity.delete();
            }
            this._EntityCollection.splice(i, 1);
            i--;
        }
    };
    //绘制漫游线
    CameraRoam.prototype.drawLineroute = function (points) {
        if (this._drawLineentity) {
            this._drawLineentity.delete();
        }
        let polylinepoints = [];
        points.forEach((e) => {
            let point = Li.Cartesian3.fromDegrees(e[0], e[1], e[2]).toVector3();
            polylinepoints.push(point);
        });
        var lineopt = {
            id: this._id,
            width: 5, //线宽
            alpha: 1, //线的透明度
            pointArr: polylinepoints, //坐标点
            color: Li.Color.fromRgb(211, 25, 222, 255), //线的颜色
            altitudemethod: Li.AltitudeMethod.Absolute, //海拔高度模式
            name: "line-roam", //名称
            show: true,
        };
        this._drawLineentity = this._addLineEntity(lineopt);
    };
    //================================临时方法 end=================
    //计算出当前时间(时间归一化)
    CameraRoam.prototype._setFlyDuration = function (flytime, duration) {
        let time = flytime / duration;
        time = Math.min(time, 1.0);
        return time;
    };
    // 根据时间插值
    CameraRoam.prototype._lerpToTime = function (
        startVector3,
        endVector3,
        time
    ) {
        return Li.Vector3.lerp(startVector3, endVector3, time);
    };
    // 计算飞行路径
    CameraRoam.prototype._computebezierPath = function (roampoints) {
        let stops = roampoints;
        let len = stops.length;
        if (len < 3) {
            let newstops = [];
            for (let i = 0; i < len; i++) {
                let nowposition = Li.Cartesian3.fromDegrees(
                    Number(stops[i].lon),
                    Number(stops[i].lat),
                    Number(stops[i].alt)
                ).toVector3();
                newstops.push({
                    position: nowposition,
                    speed: Number(stops[i].speed),
                    name: stops[i].name,
                    siteid: stops[i].siteid,
                });
            }
            return newstops;
        }

        let ThreepathList = this._OneToTwoextendpoint(roampoints);

        let mPath = this._createBeziercurveroute(ThreepathList);
        let newstops = [];
        //let newposition = [];
        for (let j = 0; j < mPath.length; j++) {
            let newpathpoint = mPath[j];
            let stop = stops[newpathpoint.indexline];
            if (stop.speed) {
                //newposition.push(newpathpoint.position);
                newstops.push({
                    position: newpathpoint.position,
                    speed: Number(stop.speed),
                    name: stop.name,
                    siteid: stop.siteid,
                    index: newpathpoint.index,
                });
            }
        }
        //最后站点
        let laststop = stops[stops.length - 1];
        newstops.push({
            position: Li.Cartesian3.fromDegrees(
                Number(laststop.lon),
                Number(laststop.lat),
                Number(laststop.alt)
            ).toVector3(),
            name: laststop.name,
            siteid: laststop.siteid,
        });
        return newstops;
    };
    //计算出来第二个站点开始，每个站点的前后的延长点，便于生成圆滑的贝塞尔曲线(3点会生成X为3"(X-1)*3+1"=5个点)
    //第一个点和最后一个点不生成，第二个点在漫游路线前后生成距离几米生成两个点
    CameraRoam.prototype._OneToTwoextendpoint = function (stops) {
        let pathList = [];
        for (let i = 0; i < stops.length - 1; i++) {
            let left = stops[i];
            let right = stops[i + 1];
            let onepoint = Li.Cartesian3.fromDegrees(
                Number(left.lon),
                Number(left.lat),
                Number(left.alt)
            ).toVector3();
            let twopoint = Li.Cartesian3.fromDegrees(
                Number(right.lon),
                Number(right.lat),
                Number(right.alt)
            ).toVector3();
            let standoff1 = this._createstandoffdistance(
                onepoint,
                twopoint,
                true
            );
            let standoff2 = this._createstandoffdistance(
                onepoint,
                twopoint,
                false
            );
            pathList.push(onepoint);
            pathList.push(standoff1);
            pathList.push(standoff2);
        }
        pathList.pop();
        return pathList;
    };
    //两点之间，相隔几米生成一个新坐标
    CameraRoam.prototype._createstandoffdistance = function (
        onepoint,
        twopoint,
        isToLeft
    ) {
        // 计算两点之间的距离
        let distance = onepoint.distanceToPoint(twopoint);
        // 第二个点减去第一个点,然后归一化
        let normal = Li.Vector3.create(
            twopoint.x - onepoint.x,
            twopoint.y - onepoint.y,
            twopoint.z - onepoint.z
        ).normalize();
        let dis = this._standoffdistance;
        if (dis > distance) {
            dis = distance / 2;
        }
        //偏移值
        normal = Li.Vector3.create(
            normal.x * dis,
            normal.y * dis,
            normal.z * dis
        );
        let pposition = null;
        if (isToLeft) {
            pposition = Li.Vector3.create(
                onepoint.x + normal.x,
                onepoint.y + normal.y,
                onepoint.z + normal.z
            );
        } else {
            pposition = Li.Vector3.create(
                twopoint.x - normal.x,
                twopoint.y - normal.y,
                twopoint.z - normal.z
            );
        }
        return pposition;
    };
    //两点之间，相隔几米生成一个新坐标 暂时无用
    CameraRoam.prototype._createstandoffdistance_des = function (
        onepoint,
        twopoint
    ) {
        let distance = Li.Cartesian3.distance(
            onepoint.toCartesian3(),
            twopoint.toCartesian3()
        );
        let subtractdiff = Li.Vector3.subtract(twopoint, onepoint);
        subtractdiff = subtractdiff.normalize(); //标准化
        let scalar = this._standoffdistance / distance; //百分比
        let newsubtractdiff = Li.Vector3.multiplyByScalar(subtractdiff, scalar);
        let newstartpoint = Li.Vector3.add(onepoint, newsubtractdiff);
        return newstartpoint;
    };
    //生成完成的贝塞尔曲线 数组——漫游路线
    CameraRoam.prototype._createBeziercurveroute = function (ThreepathList) {
        let mPath = [];
        let loopnum = ThreepathList.length / 3;
        //把初始两个点叠加上
        mPath.push({
            position: ThreepathList[0],
            indexline: 0, //第1条线
        });
        mPath.push({
            position: ThreepathList[1],
            indexline: 0, //第1条线
        });
        //循环是从第三个点开始
        let indexline = 0; //第1条线
        for (let y = 1; y < loopnum; y++) {
            let num = y * 3;
            //转折点的三个点
            let p1 = ThreepathList[num - 1];
            let p2 = ThreepathList[num];
            let p3 = ThreepathList[num + 1];
            // 生成21个点的贝塞尔曲线 需要取中间值
            let pathLists = this._getBezierList(p1, p2, p3, 21);
            let size = pathLists.length;
            for (let t = 0; t < size; t++) {
                let l = Math.floor(size / 2 + 1);
                if (l == t) {
                    indexline++;
                }
                let time = t / (size - 1);
                let opt = {
                    position: pathLists[t],
                    indexline: indexline,
                    index: time,
                };
                mPath.push(opt);
            }
        }
        //把最后1个点叠加上
        mPath.push({
            position: ThreepathList[ThreepathList.length - 1],
            indexline: indexline, //最后一条线
        });
        return mPath;
    };
    // 获取贝塞尔曲线点列表,(segmentNum贝塞尔曲线分段数)
    CameraRoam.prototype._getBezierList = function (
        startPoint,
        controlPoint,
        endPoint,
        segmentNum
    ) {
        let pointPath = [];
        for (let i = 1; i <= segmentNum; i++) {
            let d = i / Number(segmentNum);
            let point = this._calculateCubicBezierPoint(
                startPoint,
                controlPoint,
                endPoint,
                d
            );
            pointPath.push(point);
        }
        return pointPath;
    };
    // 计算三次贝塞尔点
    CameraRoam.prototype._calculateCubicBezierPoint = function (p1, p2, p3, t) {
        let u = 1.0 - t;
        let tt = t * t;
        let uu = u * u;

        let c1 = Li.Vector3.create(
            2 * u * t * p2.x,
            2 * u * t * p2.y,
            2 * u * t * p2.z
        );
        let c2 = Li.Vector3.create(tt * p3.x, tt * p3.y, tt * p3.z);

        let p = Li.Vector3.create(uu * p1.x, uu * p1.y, uu * p1.z);
        p = Li.Vector3.create(p.x + c1.x, p.y + c1.y, p.z + c1.z);
        p = Li.Vector3.create(p.x + c2.x, p.y + c2.y, p.z + c2.z);

        return p;
    };
    return CameraRoam;
}

//粒子系统
function global(Li, viewer) {
    /**
     * @description 粒子系统管理（创建、更新、显示和销毁）。
     * @constructor
     * @alias ParticleSystem
     */
    function ParticleSystem() {
        this._ParticlesObjects = {}; //所有的粒子系统对象
        this._ParticlesidList = []; //所有粒子的id
        this._nowid = null; //当前id
        this._particleentity = null; //当前粒子系统
    }
    Object.defineProperties(ParticleSystem.prototype, {
        /**
         * 当前粒子对象id
         * @memberof ParticleSystem.prototype
         * @type {String}
         * @readonly
         */
        id: {
            get() {
                return this._nowid;
            },
        },
        /**
         * Li.Entity实例对象. 当前实例化的粒子对象
         * @memberof ParticleSystem.prototype
         * @type {Entity}
         * @readonly
         */
        particleentity: {
            get() {
                return this._particleentity;
            },
        },
        /**
         * 粒子对象的集合
         * @memberof ParticleSystem.prototype
         * @type {Array}
         * @readonly
         */
        ParticleCollection: {
            get() {
                let list = [];
                for (let key in this._ParticlesObjects) {
                    let opt = {
                        id: key,
                        entity: this._ParticlesObjects[key],
                    };
                    list.push(opt);
                }
                return list;
            },
        },
        /**
         * 当前粒子对象的显示否
         * @memberof ParticleSystem.prototype
         * @type {Boolean}
         */
        show: {
            get() {
                if (this._particleentity) {
                    return this._particleentity.enabled;
                } else {
                    return null;
                }
            },
            set(bol) {
                if (this._particleentity) {
                    this._particleentity.enabled = bol;
                }
            },
        },
        //====默认参数=====
        //圆点粒子参数
        _cirparticle: {
            get() {
                return {
                    type: "cirparticle", //类型
                    emitteropt: {
                        emitRate: 80, //发射率
                        lifeSpan: 4000, //粒子生命周期
                        shapeType: 2, //粒子形状类型 shapeType: Li.ParticleShapeType.Ellipse, //粒子形状类型
                        fillShape: true, //是否填充粒子形状
                        size: [4, 4], //粒子大小
                        endSize: [4, 4], //粒子结束时的大小
                        shapeSize: [1, 1], //粒子形状大小
                        sizeVariation: [1, 1], //粒子大小的变化率
                        //速度向量
                        velocity: {
                            direction: [0.1, 0.1, 0.1], //方向速度
                            variation: [13, 13, 13], //方向速度变化率
                        },
                        //加速度向量
                        acceleration: {
                            direction: [1, 1, 1], //方向加速度
                            variation: [1, 1, 1], //加速度变化率
                        },
                    },
                    renderer: {
                        color: "rgba(0, 204, 255, 1)", // Li.Color.fromRgb(0, 204, 255, 255), //粒子颜色
                        colorVariation: 0, //
                        alpha: 0.55,
                        alphaVariation: 0.01,
                        alignedAxis: [0, 0, 0],
                        blendMode: "NormalBlend", //blendMode: Li.ParticleBlendMode.NormalBlend, //设置粒子混合模式
                        image: "/assets/images/particle/particle1.png",
                    },
                };
            },
        },
        //粒子形状类型
        _particleshapetype: {
            get() {
                return {
                    0: Li.ParticleShapeType.Line, //线条
                    1: Li.ParticleShapeType.Rectangle, //矩形
                    2: Li.ParticleShapeType.Ellipse, //椭圆形
                };
            },
        },
        //火焰粒子参数
        _fireparticle: {
            get() {
                return {
                    type: "fireparticle", //类型
                    emitteropt: {
                        emitRate: 200, //发射率
                        lifeSpan: 4000, //粒子生命周期
                        shapeType: 1, //粒子形状类型 shapeType: Li.ParticleShapeType.Ellipse, //粒子形状类型
                        fillShape: true, //是否填充粒子形状
                        size: [16, 16], //粒子大小
                        endSize: [2, 2], //粒子结束时的大小
                        shapeSize: [40, 20], //粒子形状大小
                        sizeVariation: [0, 0], //粒子大小的变化率
                        //速度向量
                        velocity: {
                            direction: [0, 0, 0], //方向速度
                            variation: [1, 1, 0], //方向速度变化率
                        },
                        //加速度向量
                        acceleration: {
                            direction: [0, 0, 8], //方向加速度
                            variation: [1, 1, 0], //加速度变化率
                        },
                    },
                    renderer: {
                        color: "rgba(254, 138, 73, 1)", // Li.Color.fromRgb(0, 204, 255, 255), //粒子颜色
                        colorVariation: 0.1, //
                        alpha: 0.35,
                        alphaVariation: 0.1,
                        alignedAxis: [0, 0, 0],
                        blendMode: "NormalBlend", //blendMode: Li.ParticleBlendMode.NormalBlend, //设置粒子混合模式
                        image: "/assets/images/particle/glowdot2.png",
                    },
                };
            },
        },
        //爆炸粒子参数
        _blastparticle: {
            get() {
                return {
                    type: "blastparticle", //类型
                    emitteropt: {
                        emitRate: 550, //发射率
                        lifeSpan: 1400, //粒子生命周期
                        shapeType: 1, //粒子形状类型 shapeType: Li.ParticleShapeType.Ellipse, //粒子形状类型
                        fillShape: true, //是否填充粒子形状
                        size: [30, 30], //粒子大小
                        endSize: [2, 2], //粒子结束时的大小
                        shapeSize: [40, 20], //粒子形状大小
                        sizeVariation: [0, 0], //粒子大小的变化率
                        //速度向量
                        velocity: {
                            direction: [0, 0, 0], //方向速度
                            variation: [55, 55, 55], //方向速度变化率
                        },
                        //加速度向量
                        acceleration: {
                            direction: [0, 0, 8], //方向加速度
                            variation: [55, 55, 55], //加速度变化率
                        },
                    },
                    renderer: {
                        color: "rgba(254, 138, 73, 1)", // Li.Color.fromRgb(0, 204, 255, 255), //粒子颜色
                        colorVariation: 0.1, //
                        alpha: 0.35,
                        alphaVariation: 0.1,
                        alignedAxis: [0, 0, 0],
                        blendMode: "NormalBlend", //blendMode: Li.ParticleBlendMode.NormalBlend, //设置粒子混合模式
                        image: "/assets/images/particle/glowdot2.png",
                    },
                };
            },
        },
        //尾焰粒子参数
        _tailflameparticle: {
            get() {
                return {
                    type: "tailflameparticle", //类型
                    emitteropt: {
                        emitRate: 1300, //发射率
                        lifeSpan: 1680, //粒子生命周期
                        shapeType: 1, //粒子形状类型 shapeType: Li.ParticleShapeType.Ellipse, //粒子形状类型
                        fillShape: true, //是否填充粒子形状
                        size: [5, 5], //粒子大小
                        endSize: [1, 1], //粒子结束时的大小
                        shapeSize: [5, 5], //粒子形状大小
                        sizeVariation: [0, 0], //粒子大小的变化率
                        //速度向量
                        velocity: {
                            direction: [0, 0, -30], //方向速度
                            variation: [1, 1, 0], //方向速度变化率
                        },
                        //加速度向量
                        acceleration: {
                            direction: [0, 0, -30], //方向加速度
                            variation: [1, 1, -60], //加速度变化率
                        },
                    },
                    renderer: {
                        color: "rgba(254, 138, 73, 1)", // Li.Color.fromRgb(0, 204, 255, 255), //粒子颜色
                        colorVariation: 0.1, //
                        alpha: 0.35,
                        alphaVariation: 0.1,
                        alignedAxis: [0, 0, -2],
                        blendMode: "NormalBlend", //blendMode: Li.ParticleBlendMode.NormalBlend, //设置粒子混合模式
                        image: "/assets/images/particle/glowdot2.png",
                    },
                };
            },
        },
        //烟粒子参数
        _smokeparticle: {
            get() {
                return {
                    type: "smokeparticle", //类型
                    emitteropt: {
                        emitRate: 120, //发射率
                        lifeSpan: 8000, //粒子生命周期
                        shapeType: 2, //粒子形状类型 shapeType: Li.ParticleShapeType.Ellipse, //粒子形状类型
                        fillShape: true, //是否填充粒子形状
                        size: [6, 6], //粒子大小
                        endSize: [35, 35], //粒子结束时的大小
                        shapeSize: [40, 20], //粒子形状大小
                        sizeVariation: [6, 6], //粒子大小的变化率
                        //速度向量
                        velocity: {
                            direction: [0.5, 0.5, 0.2], //方向速度
                            variation: [2, 2, 0], //方向速度变化率
                        },
                        //加速度向量
                        acceleration: {
                            direction: [1, 1, 4], //方向加速度
                            variation: [1, 1, 1], //加速度变化率
                        },
                    },
                    renderer: {
                        color: "rgba(25, 25, 25, 1)", // Li.Color.fromRgb(0, 204, 255, 255), //粒子颜色
                        colorVariation: 0, //
                        alpha: 0.15,
                        alphaVariation: 0.05,
                        alignedAxis: [0, 0, 0],
                        blendMode: "NormalBlend", //blendMode: Li.ParticleBlendMode.NormalBlend, //设置粒子混合模式
                        image: "/assets/images/particle/smoke.png",
                    },
                };
            },
        },
        //水柱粒子
        _watercolparticle: {
            get() {
                return {
                    type: "watercolparticle", //类型
                    emitteropt: {
                        emitRate: 1200, //发射率
                        lifeSpan: 1500, //粒子生命周期
                        shapeType: 2, ////粒子形状类型
                        fillShape: true, //是否填充粒子形状
                        size: [5, 5], //粒子大小
                        endSize: [10, 10], //粒子结束时的大小
                        shapeSize: [1, 1], //粒子形状大小
                        sizeVariation: [0, 0], //粒子大小的变化率
                        //速度向量
                        velocity: {
                            direction: [15, 0, 0], //方向速度
                            variation: [0, 0, 2], //方向速度变化率
                        },
                        //加速度向量
                        acceleration: {
                            direction: [20, 0, 0], //方向加速度
                            variation: [0, 0, 0.5], //加速度变化率
                        },
                    },
                    renderer: {
                        color: "rgba(220, 235, 255, 1)", // Li.Color.fromRgb(0, 204, 255, 255), //粒子颜色
                        colorVariation: 0, //
                        alpha: 0.8,
                        alphaVariation: 0,
                        alignedAxis: [1, 0, 0],
                        blendMode: "AdditiveBlend", //设置粒子混合模式
                        image: "/assets/images/particle/pressuriseWater.png",
                    },
                };
            },
        },
        //水柱弧度粒子
        _watercolarcparticle: {
            get() {
                return {
                    type: "watercolarcparticle", //类型
                    emitteropt: {
                        emitRate: 2200, //发射率
                        lifeSpan: 2500, //粒子生命周期
                        shapeType: 2, ////粒子形状类型
                        fillShape: true, //是否填充粒子形状
                        size: [5, 5], //粒子大小
                        endSize: [10, 10], //粒子结束时的大小
                        shapeSize: [1, 1], //粒子形状大小
                        sizeVariation: [0, 0], //粒子大小的变化率
                        //速度向量
                        velocity: {
                            direction: [15, 0, 15], //方向速度
                            variation: [0, 0, 1.2], //方向速度变化率
                        },
                        //加速度向量
                        acceleration: {
                            direction: [8, 0, -20], //方向加速度
                            variation: [0, 0, 0.5], //加速度变化率
                        },
                    },
                    renderer: {
                        color: "rgba(220, 235, 255, 1)", // Li.Color.fromRgb(0, 204, 255, 255), //粒子颜色
                        colorVariation: 0, //
                        alpha: 0.9,
                        alphaVariation: 0,
                        alignedAxis: [1, 0, 0],
                        blendMode: "AdditiveBlend", //设置粒子混合模式
                        image: "/assets/images/particle/pressuriseWater.png",
                    },
                };
            },
        },
        //喷泉粒子
        _fountainparticle: {
            get() {
                return {
                    type: "fountainparticle", //类型
                    emitteropt: {
                        emitRate: 3200, //发射率
                        lifeSpan: 1800, //粒子生命周期
                        shapeType: 1, ////粒子形状类型
                        fillShape: true, //是否填充粒子形状
                        size: [3, 3], //粒子大小
                        endSize: [5, 5], //粒子结束时的大小
                        shapeSize: [1, 1], //粒子形状大小
                        sizeVariation: [0, 0], //粒子大小的变化率
                        //速度向量
                        velocity: {
                            direction: [0, 0, 50], //方向速度
                            variation: [5.5, 5.5, 0], //方向速度变化率
                        },
                        //加速度向量
                        acceleration: {
                            direction: [0, 0, -80], //方向加速度
                            variation: [0, 0, 0], //加速度变化率
                        },
                    },
                    renderer: {
                        color: "rgba(220, 235, 255, 1)", // Li.Color.fromRgb(0, 204, 255, 255), //粒子颜色
                        colorVariation: 0, //
                        alpha: 0.9,
                        alphaVariation: 0,
                        alignedAxis: [0, 0, 1],
                        blendMode: "AdditiveBlend", //设置粒子混合模式
                        image: "/assets/images/particle/pressuriseWater.png",
                    },
                };
            },
        },
        //雨粒子
        _rainparticle: {
            get() {
                return {
                    type: "rainparticle", //类型
                    emitteropt: {
                        emitRate: 5000, //发射率
                        lifeSpan: 3000, //粒子生命周期
                        shapeType: 2, ////粒子形状类型
                        fillShape: true, //是否填充粒子形状
                        size: [8, 8], //粒子大小
                        endSize: [6, 6], //粒子结束时的大小
                        shapeSize: [10000, 8000], //粒子形状大小
                        sizeVariation: [2, 6], //粒子大小的变化率
                        //速度向量
                        velocity: {
                            direction: [0, 0, -400], //方向速度
                            variation: [1, 1, 0], //方向速度变化率
                        },
                        //加速度向量
                        acceleration: {
                            direction: [0, 0, -300], //方向加速度
                            variation: [1, 1, 0], //加速度变化率
                        },
                    },
                    renderer: {
                        color: "rgba(220, 235, 255, 1)", // Li.Color.fromRgb(0, 204, 255, 255), //粒子颜色
                        colorVariation: 0, //
                        alpha: 0.6,
                        alphaVariation: 0.2,
                        alignedAxis: [0.1, 0.1, 1],
                        blendMode: "AdditiveBlend", //设置粒子混合模式
                        image: "/assets/images/particle/rain.png",
                    },
                };
            },
        },
        //雪粒子
        _snowparticle: {
            get() {
                return {
                    type: "snowparticle", //类型
                    emitteropt: {
                        emitRate: 1300, //发射率
                        lifeSpan: 20000, //粒子生命周期
                        shapeType: 1, ////粒子形状类型
                        fillShape: true, //是否填充粒子形状
                        size: [5, 5], //粒子大小
                        endSize: [5, 5], //粒子结束时的大小
                        shapeSize: [10000, 8000], //粒子形状大小
                        sizeVariation: [2, 1], //粒子大小的变化率
                        //速度向量
                        velocity: {
                            direction: [0, 0, -10], //方向速度
                            variation: [8, 8, -1], //方向速度变化率
                        },
                        //加速度向量
                        acceleration: {
                            direction: [0, 0, -2], //方向加速度
                            variation: [1, 1, 0], //加速度变化率
                        },
                    },
                    renderer: {
                        color: "rgba(255, 255, 255, 1)", // Li.Color.fromRgb(0, 204, 255, 255), //粒子颜色
                        colorVariation: 0, //
                        alpha: 0.8,
                        alphaVariation: 0,
                        alignedAxis: [0, 0, 0],
                        blendMode: "AdditiveBlend", //设置粒子混合模式
                        image: "/assets/images/particle/snow.png",
                    },
                };
            },
        },
        //雾粒子
        _fogparticle: {
            get() {
                return {
                    type: "fogparticle", //类型
                    emitteropt: {
                        emitRate: 1400, //发射率
                        lifeSpan: 10000, //粒子生命周期
                        shapeType: 2, ////粒子形状类型
                        fillShape: true, //是否填充粒子形状
                        size: [12, 12], //粒子大小
                        endSize: [12, 12], //粒子结束时的大小
                        shapeSize: [1000, 1000], //粒子形状大小
                        sizeVariation: [5, 5], //粒子大小的变化率
                        //速度向量
                        velocity: {
                            direction: [0.2, 0.2, 0.2], //方向速度
                            variation: [0.2, 0.2, 0.2], //方向速度变化率
                        },
                        //加速度向量
                        acceleration: {
                            direction: [0.5, 0.5, -0.8], //方向加速度
                            variation: [1, 1, 1], //加速度变化率
                        },
                    },
                    renderer: {
                        color: "rgba(180, 180, 180, 1)", // Li.Color.fromRgb(0, 204, 255, 255), //粒子颜色
                        colorVariation: 0, //
                        alpha: 0.09,
                        alphaVariation: 0,
                        alignedAxis: [0, 0, 0],
                        blendMode: "AdditiveBlend", //设置粒子混合模式
                        image: "/assets/images/particle/smoke.png",
                    },
                };
            },
        },
    });

    /**
     * @description 根据类型获取粒子默认参数
     * @param {String} type -类型
     * @returns {Object} 返回对应的粒子默认参数
     */
    ParticleSystem.prototype.getparticleparBytype = function (type) {
        let nowparticlepar = this["_" + type];
        return nowparticlepar;
    };

    /**
     * @description 创建不同的粒子对象
     * @param {Object} options -参数
     * @param {Object} options.id -粒子对象id
     * @param {Object} options.position -粒子对象坐标
     * @param {Object} options.position.longitude -粒子对象坐标-经度
     * @param {Object} options.position.latitude -粒子对象坐标-纬度
     * @param {Object} options.position.height -粒子对象坐标-海拔
     * @param {String} options.type -粒子对象类型
     * @param {Object} options.emitteropt -粒子对象发射器参数
     * @param {Number} options.emitteropt.emitRate -发射器
     * @param {Number} options.emitteropt.lifeSpan -粒子生命周期
     * @param {Number} options.emitteropt.shapeType -粒子形状类型
     *   |可选值       | 描述        |
     *   |--------     |--------    |
     *   |  0          | 线条       |
     *   |  1          | 矩形       |
     *   |  2          | 椭圆形     |
     * @param {Boolean} options.emitteropt.fillShape -是否填充粒子形状
     * @param {Array} options.emitteropt.size -粒子大小
     *   |参数       | 描述        |
     *   |--------   |--------    |
     *   | [x,y]     | x值为X轴尺寸-Number，y值为Y轴尺寸-Number    |
     * @param {Array} options.emitteropt.endSize -粒子结束时的大小
     *   |参数       | 描述        |
     *   |--------   |--------    |
     *   | [x,y]     | x值为X轴尺寸-Number，y值为Y轴尺寸-Number    |
     * @param {Array} options.emitteropt.shapeSize -粒子形状大小
     *   |参数       | 描述        |
     *   |--------   |--------    |
     *   | [x,y]     | x值为X轴尺寸-Number，y值为Y轴尺寸-Number    |
     * @param {Array} options.emitteropt.sizeVariation -粒子形状大小的变化率
     *   |参数       | 描述        |
     *   |--------   |--------    |
     *   | [x,y]     | x值为X轴尺寸-Number，y值为Y轴尺寸-Number    |
     * @param {Object} options.emitteropt.velocity -粒子速度参数
     * @param {Array} options.emitteropt.velocity.direction -粒子速度方向值
     *  |参数       | 描述        |
     *  |--------   |--------    |
     *  | [x,y,z]     | x值为X轴方向-Number，y值为Y轴方向-Number，z值为Z轴方向-Number     |
     * @param {Array} options.emitteropt.velocity.variation -粒子速度变化率
     *  |参数       | 描述        |
     *  |--------   |--------    |
     *  | [x,y,z]    | x值为X轴变化值-Number，y值为Y轴变化值-Number，z值为Z轴变化值-Number  |
     * @param {Object} options.emitteropt.acceleration -粒子加速度参数
     * @param {Array} options.emitteropt.acceleration.direction -粒子速度方向值
     *  |参数       | 描述        |
     *  |--------   |--------    |
     *  | [x,y,z]     | x值为X轴方向-Number，y值为Y轴方向-Number，z值为Z轴方向-Number     |
     * @param {Array} options.emitteropt.acceleration.variation -粒子速度变化率
     *  |参数       | 描述        |
     *  |--------   |--------    |
     *  | [x,y,z]    | x值为X轴变化值-Number，y值为Y轴变化值-Number，z值为Z轴变化值-Number  |
     * @param {Object} options.renderer -粒子对象渲染器参数
     * @param {String} options.renderer.color -粒子对象的颜色
     *  |参数       | 描述        |
     *  |--------   |--------    |
     *  | "rgba(255, 0, 0, 1)"   | rgba(红色值[0-255],绿色值[0-255], 蓝色值[0-255], 透明值[0-1])  |
     * @param {Number} options.renderer.colorVariation -粒子对象的颜色变化率
     * @param {Number} options.renderer.alpha -粒子对象的颜色透明度
     * @param {Number} options.renderer.alphaVariation -粒子对象的颜色透明度变化率
     * @param {Array} options.renderer.alignedAxis -粒子对象对齐的轴
     *  |参数       | 描述        |
     *  |--------   |--------    |
     *  | [x,y,z]    | x值为X轴尺寸-Number，y值为Y轴尺寸-Number，z值为Z轴尺寸-Number  |
     * @param {Array} options.renderer.blendMode -粒子混合模式
     *   |可选值       | 描述        |
     *   |--------     |--------    |
     *   |  'NormalBlend'     | 正常混合       |
     *   |  'AdditiveBlend'     | 叠加混合       |
     * @param {Array} options.renderer.image -粒子贴图路径
     * @returns {Object} 返回粒子id和粒子对象实体-Entity
     */
    ParticleSystem.prototype.createParticle = function (options) {
        let opt = options;
        let position = Li.Cartographic.fromDegrees(
            options.position.longitude,
            options.position.latitude,
            options.position.height <= 0 ? 1 : options.position.height
        );
        if (options.imgurl) {
            opt.renderer.image = options.imgurl;
        }
        if (opt) {
            let particle = this._createParticleSystem(position, opt);
            this._ParticlesObjects[particle.id] = {
                attr: opt,
                entity: particle.particleentity,
            };
            this._nowid = particle.id;
            this._ParticlesidList.push(particle.id);
            this._particleentity = particle.particleentity;
            return particle;
        }
    };
    ParticleSystem.prototype._createParticleSystem = function (
        lonlat,
        options
    ) {
        //粒子系统
        var particleSystem = new Li.ParticleSystem();
        //方向
        let emitteropt = options.emitteropt;
        let emitter = this._createParticleEmitter(emitteropt);
        particleSystem.addEmitter(emitter);
        //渲染
        let renderer = this._createImageParticleRenderer(options.renderer);
        particleSystem.addRenderer(renderer);

        // entity
        var entity = new Li.Entity();
        entity.transform.cartographic = lonlat;
        entity.addComponent(particleSystem);
        entity.objectName = options.type;
        viewer.scene.addEntity(entity);
        return {
            particleentity: entity,
            id: options.id || createGuid(),
        };
    };
    /**
     * @description 根据id获取粒子
     * @param {String} id -粒子id
     * @returns {Object} 返回对应的粒子对象-Entity
     */
    ParticleSystem.prototype.getparticleById = function (id) {
        let particleentity = this._ParticlesObjects[id];
        if (particleentity) {
            return particleentity;
        }
        return null;
    };
    /**
     * @description 根据id是否显示粒子对象实体
     * @param {String} id -粒子id
     * @param {Boolean} isshow -是否显示
     */
    ParticleSystem.prototype.showById = function (id, isshow) {
        if (id) {
            if (this._ParticlesObjects[id]) {
                this._ParticlesObjects[id].entity.enabled =
                    isshow || !this._ParticlesObjects[id].entity.enabled;
            }
        }
    };
    /**
     * @description 根据id更新粒子对象
     * @param {Object} options -参数
     * @param {Object} options.id -粒子对象id
     * @param {Object} options.position -粒子对象坐标
     * @param {Object} options.position.longitude -粒子对象坐标-经度
     * @param {Object} options.position.latitude -粒子对象坐标-纬度
     * @param {Object} options.position.height -粒子对象坐标-海拔
     * @param {Object} options.emitteropt -粒子对象发射器参数
     * @param {Number} options.emitteropt.emitRate -发射器
     * @param {Number} options.emitteropt.lifeSpan -粒子生命周期
     * @param {Number} options.emitteropt.shapeType -粒子形状类型
     *   |可选值       | 描述        |
     *   |--------     |--------    |
     *   |  0          | 线条       |
     *   |  1          | 矩形       |
     *   |  2          | 椭圆形     |
     * @param {Boolean} options.emitteropt.fillShape -是否填充粒子形状
     * @param {Array} options.emitteropt.size -粒子大小
     *   |参数       | 描述        |
     *   |--------   |--------    |
     *   | [x,y]     | x值为X轴尺寸-Number，y值为Y轴尺寸-Number    |
     * @param {Array} options.emitteropt.endSize -粒子结束时的大小
     *   |参数       | 描述        |
     *   |--------   |--------    |
     *   | [x,y]     | x值为X轴尺寸-Number，y值为Y轴尺寸-Number    |
     * @param {Array} options.emitteropt.shapeSize -粒子形状大小
     *   |参数       | 描述        |
     *   |--------   |--------    |
     *   | [x,y]     | x值为X轴尺寸-Number，y值为Y轴尺寸-Number    |
     * @param {Array} options.emitteropt.sizeVariation -粒子形状大小的变化率
     *   |参数       | 描述        |
     *   |--------   |--------    |
     *   | [x,y]     | x值为X轴尺寸-Number，y值为Y轴尺寸-Number    |
     * @param {Object} options.emitteropt.velocity -粒子速度参数
     * @param {Array} options.emitteropt.velocity.direction -粒子速度方向值
     *  |参数       | 描述        |
     *  |--------   |--------    |
     *  | [x,y,z]     | x值为X轴方向-Number，y值为Y轴方向-Number，z值为Z轴方向-Number     |
     * @param {Array} options.emitteropt.velocity.variation -粒子速度变化率
     *  |参数       | 描述        |
     *  |--------   |--------    |
     *  | [x,y,z]    | x值为X轴变化值-Number，y值为Y轴变化值-Number，z值为Z轴变化值-Number  |
     * @param {Object} options.emitteropt.acceleration -粒子加速度参数
     * @param {Array} options.emitteropt.acceleration.direction -粒子速度方向值
     *  |参数       | 描述        |
     *  |--------   |--------    |
     *  | [x,y,z]     | x值为X轴方向-Number，y值为Y轴方向-Number，z值为Z轴方向-Number     |
     * @param {Array} options.emitteropt.acceleration.variation -粒子速度变化率
     *  |参数       | 描述        |
     *  |--------   |--------    |
     *  | [x,y,z]    | x值为X轴变化值-Number，y值为Y轴变化值-Number，z值为Z轴变化值-Number  |
     * @param {Object} options.renderer -粒子对象渲染器参数
     * @param {String} options.renderer.color -粒子对象的颜色
     *  |参数       | 描述        |
     *  |--------   |--------    |
     *  | "rgba(255, 0, 0, 1)"   | rgba(红色值[0-255],绿色值[0-255], 蓝色值[0-255], 透明值[0-1])  |
     * @param {Number} options.renderer.colorVariation -粒子对象的颜色变化率
     * @param {Number} options.renderer.alpha -粒子对象的颜色透明度
     * @param {Number} options.renderer.alphaVariation -粒子对象的颜色透明度变化率
     * @param {Array} options.renderer.alignedAxis -粒子对象对齐的轴
     *  |参数       | 描述        |
     *  |--------   |--------    |
     *  | [x,y,z]    | x值为X轴尺寸-Number，y值为Y轴尺寸-Number，z值为Z轴尺寸-Number  |
     * @param {Array} options.renderer.blendMode -粒子混合模式
     *   |可选值       | 描述        |
     *   |--------     |--------    |
     *   |  'NormalBlend'     | 正常混合       |
     *   |  'AdditiveBlend'     | 叠加混合       |
     * @param {Array} options.renderer.image -粒子贴图路径
     */
    ParticleSystem.prototype.updateById = function (options) {
        this._nowid = options.id || this._nowid;
        if (this._nowid) {
            let particleentity = this._ParticlesObjects[this._nowid];
            if (particleentity) {
                if (options.position) {
                    if (options.position.height) {
                        particleentity.attr.position.height =
                            options.position.height;
                    }
                    if (options.position.latitude) {
                        particleentity.attr.position.latitude =
                            options.position.latitude;
                    }
                    if (options.position.longitude) {
                        particleentity.attr.position.longitude =
                            options.position.longitude;
                    }
                }
                let particleobj = {
                    id: this._nowid,
                    position: particleentity.attr.position,
                    type: particleentity.attr.type,
                    emitteropt: options.emitteropt,
                    renderer: options.renderer,
                };
                this.removeById(options.id);
                this.createParticle(particleobj);
            }
        }
    };
    /**
     * @description 删除最新添加的粒子
     */
    ParticleSystem.prototype.remove = function () {
        if (this._nowid) {
            let entityobjcet = this._ParticlesObjects[this._nowid];
            entityobjcet.entity.delete();
            delete this._ParticlesObjects[this._nowid];
            let i = this._ParticlesidList.indexOf(this._nowid);
            this._ParticlesidList.splice(i, 1);
            if (this._ParticlesidList.length > 0) {
                this._nowid =
                    this._ParticlesidList[this._ParticlesidList.length - 1]; //当前id
                this._particleentity =
                    this._ParticlesObjects[this._nowid].particleentity; //当前粒子系统
            } else {
                this._nowid = null; //当前id
                this._particleentity = null; //当前粒子系统
            }
        }
    };
    /**
     * @description 根据id移除粒子
     * @param {String} id -粒子id
     */
    ParticleSystem.prototype.removeById = function (id) {
        if (id) {
            let entityobjcet = this._ParticlesObjects[id];
            entityobjcet.entity.delete();
            delete this._ParticlesObjects[id];
            let i = this._ParticlesidList.indexOf(this._nowid);
            this._ParticlesidList.splice(i, 1);
            if (this._ParticlesidList.length > 0) {
                this._nowid =
                    this._ParticlesidList[this._ParticlesidList.length - 1]; //当前id
                this._particleentity =
                    this._ParticlesObjects[this._nowid].particleentity; //当前粒子系统
            } else {
                this._nowid = null; //当前id
                this._particleentity = null; //当前粒子系统
            }
        }
    };
    /**
     * @description 根据类型移除粒子
     * @param {String} type -粒子类型
     */
    ParticleSystem.prototype.removeByType = function (type) {
        for (let key in this._ParticlesObjects) {
            let entityobjcet = this._ParticlesObjects[key];
            if (entityobjcet.attr.type === type) {
                entityobjcet.entity.delete();
                delete this._ParticlesObjects[key];
                let index = this._ParticlesidList.indexOf(key);
                this._ParticlesidList.splice(index, 1);
            }
        }
        if (this._ParticlesidList.length > 0) {
            this._nowid =
                this._ParticlesidList[this._ParticlesidList.length - 1]; //当前id
            this._particleentity =
                this._ParticlesObjects[this._nowid].particleentity; //当前粒子系统
        } else {
            this._nowid = null; //当前id
            this._particleentity = null; //当前粒子系统
        }
    };
    /**
     * @description 移除所有粒子
     */
    ParticleSystem.prototype.removeAll = function () {
        this._ParticlesidList.forEach((id) => {
            let entityobjcet = this._ParticlesObjects[id];
            entityobjcet.entity.delete();
            delete this._ParticlesObjects[id];
        });
        this._ParticlesidList = [];
        this._nowid = null; //当前id
        this._particleentity = null; //当前粒子系统
    };
    //粒子发射器
    ParticleSystem.prototype._createParticleEmitter = function (options) {
        var emitter = new Li.ParticleEmitter();
        let type = this._particleshapetype;
        emitter.shapeType = type[options.shapeType]; //粒子形状类型
        emitter.shapeSize = Li.Vector2.create(
            options.shapeSize[0],
            options.shapeSize[1]
        ); //发射率
        emitter.fillShape = options.fillShape; //是否填充粒子形状
        emitter.size = Li.Vector2.create(options.size[0], options.size[1]);
        emitter.endSize = Li.Vector2.create(
            options.endSize[0],
            options.endSize[1]
        );
        emitter.sizeVariation = Li.Vector2.create(
            options.sizeVariation[0],
            options.sizeVariation[1]
        );
        emitter.emitRate = options.emitRate;
        emitter.lifeSpan = options.lifeSpan;
        //方向速度
        emitter.velocity = this._createParticlePointDirection(options.velocity);
        //方向加速度
        emitter.acceleration = this._createParticlePointDirection(
            options.acceleration
        );
        return emitter;
    };
    //粒子粒子点方向类
    ParticleSystem.prototype._createParticlePointDirection = function (opt) {
        var vec = new Li.ParticlePointDirection();
        vec.x = opt.direction[0];
        vec.y = opt.direction[1];
        vec.z = opt.direction[2];
        vec.xVariation = opt.variation[0];
        vec.yVariation = opt.variation[1];
        vec.zVariation = opt.variation[2];
        return vec;
    };
    //贴图粒子渲染器
    ParticleSystem.prototype._createImageParticleRenderer = function (options) {
        var renderer = new Li.ImageParticleRenderer();
        let nowcolor = disposeColor(options.color);
        renderer.color = Li.Color.fromRgb(
            nowcolor.r,
            nowcolor.g,
            nowcolor.b,
            nowcolor.a
        ); //粒子颜色
        renderer.colorVariation = options.colorVariation; //颜色变化率
        renderer.alpha = options.alpha; //粒子透明度
        renderer.alphaVariation = options.alphaVariation; //透明度变化率
        renderer.alignedAxis = Li.Vector3.create(
            options.alignedAxis[0],
            options.alignedAxis[1],
            options.alignedAxis[2]
        ); //对齐的轴
        renderer.blendMode = Li.ParticleBlendMode[options.blendMode]; //粒子混合模式
        renderer.image = options.image; //粒子贴图的url
        return renderer;
    };
    return ParticleSystem;
}

//空间分析
let analyse = {
    Skyline: global$q,
    Sightline: global$p,
    ClipBox: global$o,
    Flood: global$n,
    Buffer: global$m,
    Topology: global$l,
    Slope: global$k,
    LimitHeight: global$j,
    ViewShed: global$i,
    CutFillVolume: global$h,
    FlattenMask: global$g,
    Sunlight: global$f,
};
//几何绘制
let graphic = {
    Billboard: global$e,
    Polyline: global$d,
    Polygon: global$c,
    ExtrudeEntity: global$b,
    Shape: global$a,
    Path: global$9,
    Label: global$8,
    GeoJsonModel: global$7,
    PathEntity: global$6,
};
//特效
let effects = {
    ArcLayer: global$5,
    GeoFencing: global$4,
};
let modules = {
    ModelEntity: global$v,
    Tiles3dLayer: global$u,
    ImageryLayer: global$t,
    DomPopover: global$s,
    Measure: global$r,
    flyTo: global$x,
    EventHandler: global$w,
    CameraUtil: global$3,
    Camera: global$2,
    CameraRoam: global$1,
    analyse,
    graphic,
    effects,
    ParticleSystem: global,
};

SSmap$1.use(modules);

export { SSmap$1 as default };
