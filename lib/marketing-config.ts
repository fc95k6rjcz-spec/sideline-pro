// Verified account IDs. Collection stays off until explicitly enabled and consented.
export const GTM_CONTAINER_ID = 'GTM-PM48DSJT'
export const GA4_MEASUREMENT_ID = 'G-9LYKC3YCBD'
export const marketingEnabled = () => process.env.NEXT_PUBLIC_MARKETING_MEASUREMENT_ENABLED === 'true'
export const localMeasurementTest = () => process.env.NEXT_PUBLIC_MARKETING_LOCAL_TEST === 'true'
