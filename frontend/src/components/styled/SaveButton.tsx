import React from 'react'

type SaveButtonProps = {
  name: string
  disableName: string
  saving: boolean
}

const SaveButton = (props: SaveButtonProps): React.ReactElement => {
  return (
    <button
      disabled={props.saving}
      type="submit"
      className={`w-full text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline
              ${props.saving ? 'bg-gray-700 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-700'}`}
    >
      {props.saving ? props.disableName : props.name}
    </button>
  )
}

export default SaveButton
