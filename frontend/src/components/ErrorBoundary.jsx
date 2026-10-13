import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="card mx-auto mt-16 max-w-lg p-10 text-center" role="alert">
          <h1 className="text-lg font-semibold text-slate-100">Something went wrong</h1>
          <p className="mt-2 text-sm text-slate-400">
            The page hit an unexpected error. Your data is safe — try again.
          </p>
          <button
            type="button"
            className="btn-nexus mt-6"
            onClick={() => window.location.reload()}
          >
            Reload page
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
