import React from 'react';
import {createPortal} from "react-dom";

const modalContainer = document.getElementById('modals')!;

// @ts-ignore
const Modal = ({children, onClose, open}) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    return open ? createPortal(<div className="modal">
        <div className="modal__close" onClick={onClose}>&times;</div>
        {children}
    </div>, modalContainer) : null
}

export default Modal
