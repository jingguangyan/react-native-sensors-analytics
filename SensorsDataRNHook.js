#! node option
// 系统变量
var path = require("path"),
  fs = require("fs"),
  dir = path.resolve(__dirname, "..");
// react naviagtion
var reactNavigationContainerPath = dir + '/react-navigation/src/createNavigationContainer.js';
var reactNavigationSubscriberPath = dir + '/react-navigation/src/getChildEventSubscriber.js';

var RNClickFilePath = dir + '/react-native/Libraries/Components/Touchable/Touchable.js';
var RNClickableFiles = [
dir + '/react-native/Libraries/Renderer/implementations/ReactNativeRenderer-profiling.js',
dir + '/react-native/Libraries/Renderer/implementations/ReactNativeRenderer-dev.js',
dir + '/react-native/Libraries/Renderer/implementations/ReactNativeRenderer-prod.js'];
// click 需 hook 的自执行代码
var sensorsdataClickHookCode = "(function(thatThis){ \n"
                               +"  try {\n"
                               +"    var ReactNative = require('react-native');\n"
                               +"    var dataModule = ReactNative.NativeModules.RNSensorsDataModule;\n"
                               +"    thatThis.props.onPress && dataModule && dataModule.trackViewClick && dataModule.trackViewClick(ReactNative.findNodeHandle(thatThis))\n"
                               +"  } catch (error) { throw new Error('SensorsData RN Hook Code 调用异常: ' + error);}\n"
                               +"})(this); /* SENSORSDATA HOOK */ ";

// 判断文件是否已经被hook了；
function isAlreadyHooked(content) {
  return content.indexOf('SENSORSDATA HOOK') > -1
}

// hook click
sensorsdataHookClickRN = function () {
  if (fs.existsSync(RNClickFilePath)) {
    // 读取文件内容
    var fileContent = fs.readFileSync(RNClickFilePath, 'utf8');
    // 已经 hook 过了，不需要再次 hook
    if (isAlreadyHooked(fileContent)) return;
    console.log(`found Touchable.js: ${RNClickFilePath}`);
    // 获取 hook 的代码插入的位置
    var hookIndex = fileContent.indexOf("this.touchableHandlePress(");
    // 判断文件是否异常，不存在 touchableHandlePress 方法，导致无法 hook 点击事件
    if (hookIndex == -1) {
      throw "Can't not find touchableHandlePress function";
    };
    // 插入 hook 代码
    var hookedContent = `${fileContent.substring(0, hookIndex)}\n${sensorsdataClickHookCode}\n${fileContent.substring(hookIndex)}`;
    // 备份 Touchable.js 源文件
    fs.renameSync(RNClickFilePath, `${RNClickFilePath}_sensorsdata_backup`);
    // 重写 Touchable.js 文件
    fs.writeFileSync(RNClickFilePath, hookedContent, 'utf8');
    console.log(`modify Touchable.js succeed`);
  }
};



// hook clickable
sensorsdataHookClickableRN = function () {
  RNClickableFiles.forEach(function (onefile) {
    if (fs.existsSync(onefile)) {
        // 读取文件内容
        var content = fs.readFileSync(onefile, 'utf8');
        // 已经 hook 过了，不需要再次 hook
        if (isAlreadyHooked(content)) return;
        console.log(`found clickable.js: ${onefile}`);
        // 获取 hook 的代码插入的位置
        var objRe = /ReactNativePrivateInterface\.UIManager\.createView\([\s\S]{1,60}\.uiViewClassName,[\s\S]*?\)[,;]/;
        var match = objRe.exec(content);
        if (!match) {
          objRe = /UIManager\.createView\([\s\S]{1,60}\.uiViewClassName,[\s\S]*?\)[,;]/;
          match = objRe.exec(content);
        }
        if (!match) {
          throw "can't inject clickable js";
        }
        var lastParentheses = content.lastIndexOf(')', match.index);
        var nextCommaIndex = content.indexOf(',', match.index);
        if (nextCommaIndex == -1)
          throw "can't inject clickable js, and nextCommaIndex is -1";
        var tagName = lastArgumentName(content, nextCommaIndex).trim();
        var functionBody = `
         var saElement;
         if(typeof internalInstanceHandle !== 'undefined'){
             saElement = internalInstanceHandle;
         }else if(typeof workInProgress !== 'undefined'){
             saElement = workInProgress;
         }else if(typeof thatThis._currentElement !== 'undefined'){
             saElement = thatThis._currentElement;
         }
         var eachProgress = function (workInProgress){
           if(workInProgress == null){
             return;
           }
           var props;
           if(workInProgress.memoizedProps){
             props = workInProgress.memoizedProps;
           }else if(workInProgress.props){
             props = workInProgress.props;
           }
           if(props && props.sensorsdataparams){
             return props.sensorsdataparams;
           }else {
             if(!props ||
                !workInProgress.type ||
                workInProgress.type.displayName === 'TouchableOpacity' ||
                workInProgress.type.displayName === 'TouchableHighlight' ||
                workInProgress.type.displayName === 'TouchableWithoutFeedback'||
                workInProgress.type.displayName === 'TouchableNativeFeedback'||
                workInProgress.type.displayName === 'Pressable'||
                workInProgress.type.name === 'TouchableOpacity' ||
                workInProgress.type.name === 'TouchableHighlight' ||
                workInProgress.type.name === 'TouchableNativeFeedback'||
                workInProgress.type.name === 'TouchableWithoutFeedback'||
                workInProgress.type.displayName === undefined||
                workInProgress.type.name === undefined ||
                !props.onPress){
	                 if(workInProgress.return){
	                   return eachProgress(workInProgress.return);
	                 }else{
	                   if(workInProgress._owner && workInProgress._owner._currentElement){
	                     return eachProgress(workInProgress._owner._currentElement);
	                   }else{
	                     return eachProgress(workInProgress._owner);
	                   }
	                 }
	              }
           }
         };
         var elementProps;
         if(saElement && saElement.memoizedProps){
	        elementProps = saElement.memoizedProps;
	     }else if(saElement && saElement.props){
	        elementProps = saElement.props;
	     }
	     if(elementProps){
	         // iOS 兼容 SegmentedControl 逻辑
	        var isSegmentedControl = (saElement &&
	                                    (saElement.type === 'RNCSegmentedControl' ||
	                                    saElement.type === 'RCTSegmentedControl' ||
	                                    saElement.type.name === 'RNCSegmentedControl' ||
	                                    saElement.type.name === 'RCTSegmentedControl' ||
	                                    saElement.type.displayName === 'RNCSegmentedControl' ||
	                                    saElement.type.displayName === 'RCTSegmentedControl'));
	         if(elementProps.onStartShouldSetResponder || isSegmentedControl) {
		         var saProps = eachProgress(saElement);
		         var ReactNative = require('react-native');
		         var dataModule = ReactNative.NativeModules.RNSensorsDataModule;

             if(dataModule && dataModule.saveRootViewProperties) {
               var saRootTag;
               if(typeof nativeTopRootTag !== 'undefined') {
                 saRootTag = nativeTopRootTag;
               } else if(typeof rootContainerInstance !== 'undefined') {
                 saRootTag = rootContainerInstance;
               } else if(typeof renderExpirationTime !== 'undefined') {
                 saRootTag = renderExpirationTime;
               } else if(typeof renderLanes !== 'undefined') {
                 saRootTag = renderLanes;
               }
               if (saRootTag && (typeof saRootTag === 'number')) {
                 dataModule.saveRootViewProperties(${tagName}, true , saProps, saRootTag);
                 return;
               }
             }  
             dataModule && dataModule.saveViewProperties && dataModule.saveViewProperties(${tagName}, true , saProps);
	     }
     }`;
        var call = addTryCatch(functionBody);
        var lastReturn = content.lastIndexOf('return', match.index);
        var splitIndex = match.index;
        if (lastReturn > lastParentheses) {
          splitIndex = lastReturn;
        }
        var hookedContent = `${content.substring(
          0,
          splitIndex
        )}\n${call}\n${content.substring(splitIndex)}`;

        // 备份源文件
        fs.renameSync(onefile, `${onefile}_sensorsdata_backup`);
        // 重写文件
        fs.writeFileSync(onefile, hookedContent, 'utf8');
        console.log(`modify clickable.js succeed`);
    }
  });
};
// 恢复被 hook 过的代码
sensorsdataResetRN = function (resetFilePathList) {
  if (!Array.isArray(resetFilePathList)) return;
  resetFilePathList.forEach(function (resetFilePath) {
  // 判断需要被恢复的文件是否存在
  if (!fs.existsSync(resetFilePath)) {
    return;
  }
  var fileContent = fs.readFileSync(resetFilePath, 'utf8');
  // 未被 hook 过代码，不需要处理
  if (!isAlreadyHooked()) return;
  // 检查备份文件是否存在
  var backFilePath = `${resetFilePath}_sensorsdata_backup`;
  if (!fs.existsSync(backFilePath)) {
    throw `File: ${backFilePath} not found, Please rm -rf node_modules and npm install again`;
  }
  // 将备份文件重命名恢复 + 自动覆盖被 hook 过的同名 Touchable.js 文件
  fs.renameSync(backFilePath, resetFilePath);
  console.log(`found and reset file: ${resetFilePath}`);
  });
};

// 工具函数- add try catch
addTryCatch = function (functionBody) {
  functionBody = functionBody.replace(/this/g, 'thatThis');
  return (
    '(function(thatThis){\n' +
    '    try{\n        ' +
    functionBody +
    "    \n    } catch (error) { throw new Error('SensorsData RN Hook Code 调用异常: ' + error);}\n" +
    '})(this); /* SENSORSDATA HOOK */'
  );
};
// 工具函数 - 计算位置
function lastArgumentName (content, index) {
  --index;
  var lastComma = content.lastIndexOf(',', index);
  var lastParentheses = content.lastIndexOf('(', index);
  var start = Math.max(lastComma, lastParentheses);
  return content.substring(start + 1, index + 1);
}

navigationEventString = function () {
  var script = `if(require('react-native').Platform.OS !== 'ios') {
            return;
          }
          if(payload && payload.state && payload.state.key && payload.state.routeName && payload.state.key != payload.state.routeName) {
            var saProperties = {};
            if(payload.state.params) {
                if(!payload.state.params.sensorsdataurl){
                    saProperties.sensorsdataurl = payload.state.routeName;
                }else{
                    saProperties.sensorsdataurl = payload.state.params.sensorsdataurl;
                }
                if(payload.state.params.sensorsdataparams){
                   saProperties.sensorsdataparams = JSON.parse(JSON.stringify(payload.state.params.sensorsdataparams));
                }
            }else{
                saProperties.sensorsdataurl = payload.state.routeName;
            }
            if(type == 'didFocus') {
                 var ReactNative = require('react-native');
                 var dataModule = ReactNative.NativeModules.RNSensorsDataModule;
                 dataModule && dataModule.trackViewScreen && dataModule.trackViewScreen(saProperties);
            }
          }
          `;
  return script;
};
navigationString = function (currentStateVarName, actionName) {
  var script = `function $$$getActivePageName$$$(navigationState){
            if(!navigationState)
                return null;
            const route = navigationState.routes[navigationState.index];
            if(route.routes){
                return $$$getActivePageName$$$(route);
            }else{
                var saProperties = {};
                if(route.params) {
                  if(!route.params.sensorsdataurl){
                    saProperties.sensorsdataurl = route.routeName;
                  }else{
                    saProperties.sensorsdataurl = route.params.sensorsdataurl;
                  }
				  if(route.params.sensorsdataparams){
				    saProperties.sensorsdataparams = JSON.parse(JSON.stringify(route.params.sensorsdataparams));
				  }
                } else {
                  saProperties.sensorsdataurl = route.routeName;
                }
                return saProperties;
            }
        }`;

  if (actionName) {
    script = `${script}
	  var type = ${actionName}.type;
	  if(type == 'Navigation/SET_PARAMS' || type == 'Navigation/COMPLETE_TRANSITION') {
	        return;
	  }
	  `;
  }

  script = `${script} var params = $$$getActivePageName$$$(${currentStateVarName});
            if (require('react-native').Platform.OS === 'android') {
             var ReactNative = require('react-native');
             var dataModule = ReactNative.NativeModules.RNSensorsDataModule;
             dataModule && dataModule.trackViewScreen && dataModule.trackViewScreen(params);}`;
  return script;
};

/**
 * hook react navigation
 */
sensorsdataHookNavigationRN = function () {
  injectNavigationContainer();
  injectNavigationSubscriber();
}

injectNavigationContainer = function () {
    if (!fs.existsSync(reactNavigationContainerPath)) {
      return;
    }
      // 读取文件内容
      var content = fs.readFileSync(reactNavigationContainerPath, 'utf8');
  // 已经 hook 过了，不需要再次 hook
  if (isAlreadyHooked(fileContent)) return;
      console.log(`found navigation.js:`, reactNavigationContainerPath);
      // 获取 hook 的代码插入的位置
      var index = content.indexOf(
        "if (typeof this.props.onNavigationStateChange === 'function') {"
      );
      if (index == -1) throw 'index is -1';
      content =
        content.substring(0, index) +
        addTryCatch(navigationString('nav', 'action')) +
        '\n' +
        content.substring(index);
      var didMountIndex = content.indexOf('componentDidMount() {');
      if (didMountIndex == -1) throw 'didMountIndex is -1';
      var forEachIndex = content.indexOf(
        'this._actionEventSubscribers.forEach(subscriber =>',
        didMountIndex
      );
      var clojureEnd = content.indexOf(';', forEachIndex);
      // 插入 hook 代码
      content =
        content.substring(0, forEachIndex) +
        '{' +
        addTryCatch(navigationString('this.state.nav', null)) +
        '\n' +
        content.substring(forEachIndex, clojureEnd + 1) +
        '}' +
        content.substring(clojureEnd + 1);
      // 备份 navigation 源文件
      fs.renameSync(
        reactNavigationContainerPath,
        `${reactNavigationContainerPath}_sensorsdata_backup`
      );
      // 重写文件
      fs.writeFileSync(reactNavigationContainerPath, content, 'utf8');
};

injectNavigationSubscriber = function () {
      if (!fs.existsSync(reactNavigationSubscriberPath)) {
        return;
      }
      var content = fs.readFileSync(reactNavigationSubscriberPath, 'utf8');
      // 已经 hook 过了，不需要再次 hook
      if (isAlreadyHooked(content)) return;
      console.log(`found navigation.js:`, reactNavigationContainerPath, reactNavigationSubscriberPath);
      // 获取 hook 的代码插入的位置
      var script = 'const emit = (type, payload) => {';
      var index = content.indexOf(script);
      if (index == -1) throw 'index is -1';
      content =
        content.substring(0, index + script.length) +
        addTryCatch(navigationEventString()) +
        '\n' +
        content.substring(index + script.length);
      // 备份 navigation 源文件
      fs.renameSync(
        reactNavigationSubscriberPath,
        `${reactNavigationSubscriberPath}_sensorsdata_backup`
      );
      // 重写文件
      fs.writeFileSync(reactNavigationSubscriberPath, content, 'utf8');
      console.log(`modify navigation.js succeed`);
}

// 全部 hook 文件恢复
resetAllSensorsdataHookRN = function () {
  sensorsdataResetRN([RNClickFilePath]); // 恢复 click
  sensorsdataResetRN(RNClickableFiles); // 恢复 clickable
  sensorsdataResetRN([reactNavigationContainerPath, reactNavigationSubscriberPath]); // 恢复 navigation
};
// 全部 hook 文件
allSensorsdataHookRN = function () {
  sensorsdataHookClickRN(); // hook click
  sensorsdataHookClickableRN(); // hook clickable
  sensorsdataHookNavigationRN(); // hook navigation
};

// 命令行
switch (process.argv[2]) {
  case '-run':
    resetAllSensorsdataHookRN();
    allSensorsdataHookRN();
    break;
  case '-reset':
    resetAllSensorsdataHookRN();
    break;
  default:
    console.log('can not find this options: ' + process.argv[2]);
}

