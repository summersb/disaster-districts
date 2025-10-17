import React from 'react'
import { Button, ButtonProps } from '@/components/ui/button.tsx'

type StyledButtonProps = ButtonProps & {
  children: React.ReactNode // Type for children
  isPressed?: boolean
}

const StyledButton = (props: StyledButtonProps): React.ReactElement => {
  const buttonClassName = `p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600
   focus:outline-none focus:ring-2 focus:ring-blue-300
   ${props.isPressed ? 'bg-blue-700 shadow-inner' : 'shadow-md'}
  `
  return (
    <Button className={buttonClassName} {...props}>
      {props.children}
    </Button>
  )
}

export default StyledButton
