import React from 'react'

type PaperProps = {
  children: React.ReactNode // Type for children
  width?: string
}

const Paper = ({
  children,
  width = 'w-full',
}: PaperProps): React.ReactElement => {
  return (
    <div
      className={`${width} p-4 mb-10 shadow-lg rounded-lg bg-gray-800 text-white`}
    >
      {children}
    </div>
  )
}

export default Paper
