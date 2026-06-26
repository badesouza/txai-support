import { theme, type ThemeConfig } from 'antd';

export const appTheme: ThemeConfig = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: '#2563eb',
    colorBgBase: '#0a0a0a',
    colorBgContainer: '#111111',
    colorBgElevated: '#141414',
    colorBgLayout: '#070707',
    colorBorder: 'rgba(255, 255, 255, 0.08)',
    colorBorderSecondary: 'rgba(255, 255, 255, 0.06)',
    colorText: '#f9fafb',
    colorTextSecondary: '#9ca3af',
    colorTextTertiary: '#6b7280',
    borderRadius: 8,
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  components: {
    Table: {
      headerBg: 'rgba(255, 255, 255, 0.03)',
      headerColor: '#9ca3af',
      rowHoverBg: 'rgba(255, 255, 255, 0.04)',
      borderColor: 'rgba(255, 255, 255, 0.08)',
      cellPaddingBlock: 12,
      cellPaddingInline: 16,
    },
    Input: {
      controlHeight: 40,
      colorBgContainer: 'rgba(17, 17, 17, 0.8)',
      colorBorder: '#374151',
      activeBorderColor: '#2563eb',
    },
    Select: {
      colorBgContainer: 'rgba(17, 17, 17, 0.8)',
      colorBorder: '#374151',
    },
    Button: {
      controlHeight: 40,
    },
    Modal: {
      contentBg: '#111111',
      headerBg: '#111111',
      borderRadiusLG: 12,
    },
    Tabs: {
      inkBarColor: '#2563eb',
      itemSelectedColor: '#60a5fa',
      itemColor: '#9ca3af',
    },
    Card: {
      colorBgContainer: 'rgba(255, 255, 255, 0.03)',
    },
  },
};
