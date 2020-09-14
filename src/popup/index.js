// Utils
import {
  ref,
  watch,
  Teleport,
  onMounted,
  Transition,
  onActivated,
  onBeforeMount,
  onDeactivated,
} from 'vue';
import { createNamespace, isDef } from '../utils';

// Composition
import { useLazyRender } from '../composition/use-lazy-render';
import { CloseOnPopstateMixin } from '../mixins/close-on-popstate';

// Components
import Icon from '../icon';
import Overlay from '../overlay';

const [createComponent, bem] = createNamespace('popup');

const context = {
  zIndex: 2000,
  lockCount: 0,
  stack: [],
  find(vm) {
    return this.stack.filter((item) => item.vm === vm)[0];
  },
};

export const popupSharedProps = {
  // whether to show popup
  show: Boolean,
  // z-index
  zIndex: [Number, String],
  // transition duration
  duration: [Number, String],
  // teleport
  teleport: [String, Object],
  // overlay custom style
  overlayStyle: Object,
  // overlay custom class name
  overlayClass: String,
  // whether to show overlay
  overlay: {
    type: Boolean,
    default: true,
  },
  // prevent body scroll
  lockScroll: {
    type: Boolean,
    default: true,
  },
  // whether to lazy render
  lazyRender: {
    type: Boolean,
    default: true,
  },
  // whether to close popup when click overlay
  closeOnClickOverlay: {
    type: Boolean,
    default: true,
  },
};

export default createComponent({
  mixins: [CloseOnPopstateMixin],

  inheritAttrs: false,

  props: {
    ...popupSharedProps,
    round: Boolean,
    closeable: Boolean,
    transition: String,
    safeAreaInsetBottom: Boolean,
    position: {
      type: String,
      default: 'center',
    },
    closeIcon: {
      type: String,
      default: 'cross',
    },
    closeIconPosition: {
      type: String,
      default: 'top-right',
    },
  },

  emits: [
    'open',
    'close',
    'click',
    'opened',
    'closed',
    'update:show',
    'click-overlay',
  ],

  setup(props, { emit, attrs, slots }) {
    let opened;
    let shouldReopen;

    const zIndex = ref();

    const shouldRender = useLazyRender(() => props.show || !props.lazyRender);

    const lockScroll = () => {
      if (props.lockScroll) {
        if (!context.lockCount) {
          document.body.classList.add('van-overflow-hidden');
        }
        context.lockCount++;
      }
    };

    const unlockScroll = () => {
      if (props.lockScroll && context.lockCount) {
        context.lockCount--;

        if (!context.lockCount) {
          document.body.classList.remove('van-overflow-hidden');
        }
      }
    };

    const open = () => {
      if (opened) {
        return;
      }

      if (props.zIndex !== undefined) {
        context.zIndex = props.zIndex;
      }

      opened = true;
      lockScroll();
      zIndex.value = ++context.zIndex;
    };

    const close = () => {
      if (opened) {
        opened = false;
        unlockScroll();
        emit('update:show', false);
      }
    };

    const onClickOverlay = () => {
      emit('click-overlay');

      if (props.closeOnClickOverlay) {
        close();
      }
    };

    const renderOverlay = () => {
      if (props.overlay) {
        return (
          <Overlay
            show={props.show}
            class={props.overlayClass}
            style={props.overlayStyle}
            zIndex={zIndex.value}
            duration={props.duration}
            onClick={onClickOverlay}
          />
        );
      }
    };

    const renderCloseIcon = () => {
      if (props.closeable) {
        return (
          <Icon
            role="button"
            tabindex="0"
            name={props.closeIcon}
            class={bem('close-icon', props.closeIconPosition)}
            onClick={close}
          />
        );
      }
    };

    const onClick = (event) => emit('click', event);
    const onOpened = () => emit('opened');
    const onClosed = () => emit('closed');

    const renderPopup = () => {
      const {
        round,
        position,
        duration,
        transition,
        safeAreaInsetBottom,
      } = props;
      const isCenter = position === 'center';

      const transitionName =
        transition || (isCenter ? 'van-fade' : `van-popup-slide-${position}`);

      const style = {
        zIndex: zIndex.value,
      };

      if (isDef(duration)) {
        const key = isCenter ? 'animationDuration' : 'transitionDuration';
        style[key] = `${duration}s`;
      }

      return (
        <Transition
          name={transitionName}
          onAfterEnter={onOpened}
          onAfterLeave={onClosed}
        >
          {shouldRender.value ? (
            <div
              vShow={props.show}
              style={style}
              class={bem({
                round,
                [position]: position,
                'safe-area-inset-bottom': safeAreaInsetBottom,
              })}
              onClick={onClick}
              {...attrs}
            >
              {slots.default?.()}
              {renderCloseIcon()}
            </div>
          ) : null}
        </Transition>
      );
    };

    watch(
      () => props.show,
      (value) => {
        if (value) {
          open();
          emit('open');
        } else {
          close();
          emit('close');
        }
      }
    );

    onMounted(() => {
      if (props.show) {
        open();
      }
    });

    onActivated(() => {
      if (shouldReopen) {
        emit('update:show', true);
        shouldReopen = false;
      }
    });

    onDeactivated(() => {
      if (props.show) {
        close();
        shouldReopen = true;
      }
    });

    onBeforeMount(() => {
      if (opened) {
        unlockScroll();
      }
    });

    return () => {
      if (props.teleport) {
        return (
          <Teleport to={props.teleport}>
            {renderOverlay()}
            {renderPopup()}
          </Teleport>
        );
      }

      return (
        <>
          {renderOverlay()}
          {renderPopup()}
        </>
      );
    };
  },
});
