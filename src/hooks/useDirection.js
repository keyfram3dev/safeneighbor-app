import { useTranslation } from 'react-i18next';
import { RTL_LANGUAGES } from '../i18n';

const useDirection = () => {
  const { i18n } = useTranslation();
  const isRTL = RTL_LANGUAGES.includes(i18n.language);
  return { isRTL, dir: isRTL ? 'rtl' : 'ltr' };
};

export default useDirection;
