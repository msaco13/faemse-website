import { Component, PropsWithChildren } from 'react';

// Last line of defense: no crash may ever white-screen the site. Render a
// branded recovery card with the actual error text so failures are diagnosable.
export default class ErrorBoundary extends Component<PropsWithChildren, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <section className="bg-ink text-white min-h-[70vh] grid place-items-center text-center py-24 px-6">
        <div className="max-w-[560px]">
          <h1 className="font-disp font-bold uppercase text-5xl mb-3">Signal lost</h1>
          <p className="text-[#BCCBE7] mb-4">
            Something went wrong on this page. Reloading almost always fixes it — your data is safe.
          </p>
          <p className="text-[13px] text-[#7C90B6] font-mono mb-7 break-words whitespace-pre-wrap text-left">
            {String(this.state.error)}
            {'\n'}
            {(this.state.error as Error | null)?.stack?.split('\n').slice(1, 4).join('\n')}
          </p>
          <button onClick={() => window.location.reload()} className="btn-gold">
            Reload the page
          </button>
        </div>
      </section>
    );
  }
}
