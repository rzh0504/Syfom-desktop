import SvgIcon from '@/components/SvgIcon.vue';
import 'virtual:svg-icons-register';

export default {
  install(app) {
    app.component('SvgIcon', SvgIcon);
  },
};
