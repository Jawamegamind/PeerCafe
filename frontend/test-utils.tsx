import React from 'react';
import { render as rtlRender, act } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';

const testTheme = createTheme({
  transitions: {
    // disable animation durations in tests
    duration: {
      shortest: 0,
      shorter: 0,
      short: 0,
      standard: 0,
      complex: 0,
      enteringScreen: 0,
      leavingScreen: 0,
    },
  },
  components: {
    MuiPopover: {
      defaultProps: {
        TransitionProps: { timeout: 0 },
      },
    },
    MuiMenu: {
      defaultProps: {
        TransitionProps: { timeout: 0 },
      },
    },
    MuiSnackbar: {
      defaultProps: {
        TransitionProps: { timeout: 0 },
      },
    },
  },
});

async function render(ui: React.ReactElement, options: any = {}) {
  const { wrapper: WrapperComponent, ...rest } = options;

  const Providers = ({ children }: { children?: React.ReactNode }) => {
    if (WrapperComponent) {
      const W = WrapperComponent as React.ComponentType<any>;
      return (
        <ThemeProvider theme={testTheme}>
          <W>{children}</W>
        </ThemeProvider>
      );
    }
    return <ThemeProvider theme={testTheme}>{children}</ThemeProvider>;
  };

  const result = rtlRender(ui, { wrapper: Providers, ...rest });

  // Allow pending microtasks (async state updates on mount) to flush inside act
  await act(async () => {
    await Promise.resolve();
  });

  return result;
}

// re-export everything
export * from '@testing-library/react';
export { render };
