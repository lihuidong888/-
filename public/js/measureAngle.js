window.measureObj = []; // 用于存放标签对象的删除
window.labelObj = []; // 用于存放标签对象的修改
let convertObj = {
    // 相同数据转换
    "度-度": function (value) {
        return value;
    },
    "rad-rad": function (value) {
        return value;
    },
    // 转换数据的公式
    "度-rad": function (value) {
        return (value * Math.PI) / 180;
    },
    "rad-度": function (value) {
        return (value * 180) / Math.PI;
    },
};
function measureAngleStarts() {
    // 用于防止重复点击
    if (window.instance) {
        window.instance.remove();
        window.instance = null;
    }
    let type = { type: "angle" };
    window.instance = new SSmap.Measure(type);

    document.onmousedown = function (e) {
        if (e.button == 2) {
            if (window.instance.cache.labelList.length) {
                // 判断条件是需要等用户测量完成才保存标签对象
                window.instance.cache.labelList.forEach((labelItem) => {
                    window.labelObj.push(labelItem);
                });
                window.measureObj.push(window.instance);
                window.instance = null;
                if (window.newUnit != "度") {
                    window.labelObj.forEach((item) => {
                        let textMeasureObj = item.text;
                        if (textMeasureObj.indexOf("度") > -1) {
                            const numIndexStart =
                                textMeasureObj.indexOf("：") + 1;
                            const numIndexEnd = textMeasureObj.indexOf("度");
                            let newData = convertObj["度-" + window.newUnit](
                                textMeasureObj.slice(numIndexStart, numIndexEnd)
                            );
                            item.text =
                                Number(newData).toFixed(2) + window.newUnit;
                        }
                    });
                }
                document.onmousedown = null;
            }
        }
    };
}
function listenersAngle() {
    let convertUnit = window.oldUnit + "-" + window.newUnit;
    window.labelObj.forEach((item) => {
        let textMeasureObj = item.text;
        const num1IndexStart = textMeasureObj.indexOf("：") + 1;
        const num1IndexEnd = textMeasureObj.indexOf(window.oldUnit);
        let newData = convertObj[convertUnit](
            textMeasureObj.slice(num1IndexStart, num1IndexEnd)
        );
        item.text = Number(newData).toFixed(2) + window.newUnit;
    });
}
export default measureAngleStarts;
export const listenerAngle = listenersAngle;
