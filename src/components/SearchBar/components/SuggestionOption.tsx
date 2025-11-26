import classNames from 'classnames';
import React, { useCallback } from 'react';
import { QuerySuggestion, SuggestionOnClick, SuggestionOnMouseEnter } from '../types';
import { KqlField, KqlValue, KqlSelector, KqlOperand } from './Icons';

function getIconType(type: string) {
  switch (type) {
    case 'field':
      return <KqlField />;
    case 'value':
      return <KqlValue />;
    case 'recentSearch':
      return 'search';
    case 'conjunction':
      return <KqlSelector />;
    case 'operator':
      return <KqlOperand />;
    default:
      throw new Error(`Unknown type: ${type}`);
  }
}

interface Props {
  onClick: SuggestionOnClick;
  onMouseEnter: SuggestionOnMouseEnter;
  selected: boolean;
  index: number;
  suggestion: QuerySuggestion;
  innerRef: (index: number, node: HTMLDivElement) => void;
  ariaId: string;
  shouldDisplayDescription: boolean;
}

export const SuggestionComponent = React.memo(function SuggestionComponent(props: Props) {
  const { index, innerRef, onClick, onMouseEnter, suggestion } = props;
  const setRef = useCallback(
    (node: HTMLDivElement) => {
      innerRef(index, node);
    },
    [index, innerRef],
  );

  const handleClick = useCallback(() => {
    onClick(suggestion, index);
  }, [index, onClick, suggestion]);

  const handleMouseEnter = useCallback(() => {
    onMouseEnter(suggestion, index);
  }, [index, onMouseEnter, suggestion]);

  return (
    <div
      className={classNames({
        // eslint-disable-next-line @typescript-eslint/naming-convention
        searchbar__item: true,
        active: props.selected,
      })}
      role='option'
      onMouseEnter={handleMouseEnter}
      onClick={handleClick}
      ref={setRef}
      id={props.ariaId}
      aria-selected={props.selected}
    >
      <div
        className={classNames({
          searchSuggestionItem: true,
          ['searchSuggestionItem--' + props.suggestion.type]: true,
        })}
      >
        <div className='searchSuggestionItem__type'>{getIconType(props.suggestion.type)}</div>
        <div className='searchSuggestionItem__text' data-test-subj='autoCompleteSuggestionText'>
          {suggestion.text}
        </div>
        {props.shouldDisplayDescription && (
          <div className='searchSuggestionItem__description' data-test-subj='autoCompleteSuggestionDescription'>
            {props.suggestion.description}
          </div>
        )}
      </div>
    </div>
  );
});
