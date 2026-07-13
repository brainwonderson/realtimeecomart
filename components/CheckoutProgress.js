import { CHECKOUT_STEPS } from '../lib/checkout'

export default function CheckoutProgress({ currentStep = 'address' }) {
  const currentIndex = CHECKOUT_STEPS.findIndex(step => step.id === currentStep)

  return (
    <nav className="checkout-progress" aria-label="Langkah checkout">
      <ol className="checkout-progress-list">
        {CHECKOUT_STEPS.map((step, index) => {
          const isComplete = index < currentIndex
          const isCurrent = step.id === currentStep
          const state = isComplete ? 'complete' : isCurrent ? 'current' : 'upcoming'

          return (
            <li key={step.id} className={`checkout-progress-step checkout-progress-step--${state}`}>
              <div className="checkout-progress-marker" aria-hidden="true">
                {isComplete ? '✓' : index + 1}
              </div>
              <span className="checkout-progress-label">{step.label}</span>
              {index < CHECKOUT_STEPS.length - 1 ? (
                <span className="checkout-progress-connector" aria-hidden="true" />
              ) : null}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
