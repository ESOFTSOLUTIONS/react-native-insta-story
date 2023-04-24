import React, { useState, useEffect, useRef } from 'react';
import {
  Animated,
  Image,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  TouchableWithoutFeedback,
  ActivityIndicator,
  View,
  Platform,
  SafeAreaView,
  PanResponderGestureState,
  Easing,
} from 'react-native';
import GestureRecognizer from 'react-native-swipe-gestures';
import { Video, ResizeMode } from 'expo-av';


import { usePrevious, isNullOrWhitespace } from './helpers';
import {
  IUserStoryItem,
  NextOrPrevious,
  StoryListItemProps,
} from './interfaces';

const { width, height } = Dimensions.get('window');

export const StoryListItem = ({
  index,
  key,
  profileImage,
  profileName,
  duration,
  customCloseComponent,
  customSwipeUpComponent,
  customUpperTextComponent,
  onFinish,
  onClosePress,
  stories,
  currentPage,
  ...props
}: StoryListItemProps) => {
  const [load, setLoad] = useState<boolean>(true);
  const [pressed, setPressed] = useState<boolean>(false);
  const [status, setStatus] = useState({})
  const [content, setContent] = useState<IUserStoryItem[]>(
    stories.map((x) => ({
      ...x,
      finish: 0,
    })),
  );
  const [startTime, setStartTime] = useState(0)
  const [animation, setAnimation] = useState(null)
  const [remainingDuration, setRemainingDuration] = useState(duration)

  const [current, setCurrent] = useState(0);
  const videoPlayer = useRef();

  const progress = useRef(new Animated.Value(0)).current;

  const prevCurrentPage = usePrevious(currentPage);

  useEffect(() => {
    let isPrevious = !!prevCurrentPage && prevCurrentPage > currentPage;
    if (isPrevious) {
      setCurrent(content.length - 1);
    } else {
      setCurrent(0);
    }

    let data = [...content];
    data.map((x, i) => {
      if (isPrevious) {
        x.finish = 1;
        if (i == content.length - 1) {
          x.finish = 0;
        }
      } else {
        x.finish = 0;
      }
    });
    setContent(data);
    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  const prevCurrent = usePrevious(current);

  useEffect(() => {
    if (!isNullOrWhitespace(prevCurrent)) {
      if (prevCurrent) {
        if (
          current > prevCurrent &&
          content[current - 1].story_image == content[current].story_image
        ) {
          start();
        } else if (
          current < prevCurrent &&
          content[current + 1].story_image == content[current].story_image
        ) {
          start();
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  function start() {
    setLoad(false);
    progress.setValue(0);
    startAnimation();
  }

  function startAnimation() {
    setStartTime(Date.now())
    const anim =Animated.timing(progress, {
      toValue: 1,
      duration: remainingDuration,
      useNativeDriver: false,
      easing: Easing.linear
    })
    setAnimation(anim)
    anim.start(({ finished }) => {
      if (finished) {
        if(current !== content.length - 1) {
          next();
          setRemainingDuration(duration)
        } else {
          setRemainingDuration(duration)
          previous()
          setCurrent(0)
            start()
        }
      }
    });
  }

  function pauseAnimation() {
    animation.stop()
    const elapsedTime = Date.now() - startTime
    setRemainingDuration(remainingDuration - elapsedTime);

  }
  

  function resumeAnimation() {
    if (animation) {
      const newAnimation = Animated.timing(progress, {
        toValue: 1,
        duration: remainingDuration,
        useNativeDriver: false,
        easing: Easing.linear
      });
      setAnimation(newAnimation);
      newAnimation.start(({ finished }) => {
        if (finished) {
          if (current !== content.length - 1) {
            next();
            setRemainingDuration(duration)
          } else {
            setRemainingDuration(duration)
            previous();
          }
        }
      });
      setStartTime(Date.now());
    }
  }

  // function onSwipeUp(_props?: any) {
  //   if (onClosePress) {
  //     onClosePress();
  //   }
  //   if (content[current].onPress) {
  //     content[current].onPress?.();
  //   }
  // }

  // function onSwipeDown(_props?: any) {
  //   onClosePress();
  // }

  const config = {
    velocityThreshold: 0.3,
    directionalOffsetThreshold: 80,
  };

  function next() {
    // check if the next content is not empty
    setLoad(true);
    if (current !== content.length - 1) {
      let data = [...content];
      data[current].finish = 1;
      setContent(data);
      setCurrent(current + 1);
      progress.setValue(0);
      if(videoPlayer.current) {
        videoPlayer.current.setPositionAsync(0);
        videoPlayer.current.playAsync();
      }
    } else {
      // the next content is empty
      setCurrent(0)
      progress.setValue(0)
      let data = [...content];
    data.map((x) => (x.finish = 0));
      // close('next');
    }
  }

  function previous() {
    // checking if the previous content is not empty
    setLoad(true);
    if (current - 1 >= 0) {
      let data = [...content];
      data[current].finish = 0;
      setContent(data);
      setCurrent(current - 1);
      progress.setValue(0);
      if(videoPlayer.current) {
        videoPlayer.current.setPositionAsync(0);
        videoPlayer.current.playAsync();
      }
    } else {
      // setCurrent(0)
      // progress.setValue(0)
      // the previous content is empty
      // close('previous');
    }
  }

  const handleResetPress = async () => {
    if (videoPlayer.current) {
      const status = await videoPlayer.current.getStatusAsync();
      if (status.isLoaded) {
        await videoPlayer.current.setPositionAsync(0);
      }
    }
  };

  function close(state: NextOrPrevious) {
    let data = [...content];
    data.map((x) => (x.finish = 0));
    setContent(data);
    progress.setValue(0);
    if (currentPage == index) {
      if (onFinish) {
        onFinish(state);
      }
    }
  }

  const onLoad = async meta => {
    startAnimation(Math.ceil(meta.duration) * 1000)
};

const onEnd= () => {
    start()
};

  const swipeText =
    content?.[current]?.swipeText || props.swipeText || 'Swipe Up';

  return (
    <GestureRecognizer
      key={key}
      // onSwipeUp={onSwipeUp}
      // onSwipeDown={onSwipeDown}
      config={config}
      style={{
        flex: 1,
        backgroundColor: 'black',
      }}
    >
      <SafeAreaView>
        <View style={styles.backgroundContainer}>
          {content[current].type?.startsWith('video') ? (
            <Video
              source={{ uri: content[current].story_image }}
              ref={videoPlayer}
              style={styles.video}
              onLoad={onLoad}
              isLooping
              onPlaybackStatusUpdate={(playbackStatus) => {
                setStatus(playbackStatus)
                if(playbackStatus.didJustFinish && !playbackStatus.isLooping) {
                  onEnd()
                }
              }}
              shouldPlay
              volume={0.0}
              resizeMode={ResizeMode.STRETCH}
              // onTouchStart={previous}
            />
          ) : (
            <Image
              onLoadEnd={() => start()}
              source={{ uri: content[current].story_image }}
              style={styles.image}
            />
          )}
          {load && (
            <View style={styles.spinnerContainer}>
              <ActivityIndicator size="large" color={'white'} />
            </View>
          )}
        </View>
      </SafeAreaView>
      <View style={{ flexDirection: 'column', flex: 1 }}>
        <View style={styles.animationBarContainer}>
          {content.map((index, key) => {
            return (
              <View key={key} style={styles.animationBackground}>
                <Animated.View
                  style={{
                    flex: current == key ? progress : content[key].finish,
                    height: 2,
                    backgroundColor: 'white',
                  }}
                />
              </View>
            );
          })}
        </View>
        <View style={styles.userContainer}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Image style={styles.avatarImage} source={profileImage } />
            <Text style={styles.avatarText}>{profileName}</Text>
          </View>
         
        </View>
        {customUpperTextComponent}
        <View style={styles.pressContainer}>
          <TouchableWithoutFeedback
            onPressIn={() => {}}
            onLongPress={() => {
             setPressed(true)
             videoPlayer.current.pauseAsync()
             pauseAnimation()
            }}
            onPressOut={() => {
              setPressed(false);
              resumeAnimation()
              videoPlayer.current.playAsync();
            }}
            onPress={() => {
              if(current !== 0){
                handleResetPress()
              }
              previous();
              if (!pressed && load) {
              }
            }}
          >
            <View style={{ flex: 1 }} />
          </TouchableWithoutFeedback>
          <TouchableWithoutFeedback
            onPressIn={() => {}}
            onLongPress={() => {
              setPressed(true)
               videoPlayer.current.pauseAsync()
               pauseAnimation()
              }}
              onPressOut={() => {
                setPressed(false);
                resumeAnimation()
                 videoPlayer.current.playAsync();
              }}
            onPress={() => {
              if(current === 0 ){
                handleResetPress()
              }
              
              if (!pressed) {
                next();
              }
            }}
          >
            <View style={{ flex: 1 }} />
          </TouchableWithoutFeedback>
        </View>
      </View>
      {content[current].onPress && (
        <TouchableOpacity
          activeOpacity={1}
          // onPress={onSwipeUp}
          style={styles.swipeUpBtn}
        >
          {customSwipeUpComponent ? (
            customSwipeUpComponent
          ) : (
            <>
              <Text style={{ color: 'white', marginTop: 5 }}></Text>
              <Text style={{ color: 'white', marginTop: 5 }}>{swipeText}</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </GestureRecognizer>
  );
};

export default StoryListItem;

StoryListItem.defaultProps = {
  duration: 10000,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
},
image: {
    width: width,
    height: height,
    resizeMode: 'contain'
},
backgroundContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
},
spinnerContainer: {
    zIndex: -100,
    position: "absolute",
    justifyContent: 'center',
    backgroundColor: 'black',
    alignSelf: 'center',
    width: width,
    height: height,
},
animationBarContainer: {
    flexDirection: 'row',
    paddingTop: 10,
    paddingHorizontal: 10,
},
animationBackground: {
    height: 2,
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(117, 117, 117, 0.5)',
    marginHorizontal: 2,
},
userContainer: {
    height: 70,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
},
avatarImage: {
    height: 40,
    width: 40,
    borderRadius: 100
},
avatarText: {
    fontWeight: 'bold',
    color: 'white',
    paddingLeft: 10,
},
closeIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 70,
    paddingHorizontal: 15,
},
pressContainer: {
    flex: 1,
    flexDirection: 'row',
},
swipeUpBtn: {
    position: 'absolute',
    right: 0,
    left: 0,
    // alignItems: 'center',
    bottom: Platform.OS == 'ios' ? 20 : 50
},
video: {
    width: width,
    height: height
    // resizeMode: 'contain',
},
});
