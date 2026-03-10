import * as React from 'react';
import {Pagination} from '@shopify/hydrogen';

/**
 * <PaginatedResourceSection > is a component that encapsulate how the previous and next behaviors throughout your application.
 * @param {Class<Pagination<NodesType>>['connection']>}
 */
export function PaginatedResourceSection({
  connection,
  children,
  resourcesClassName,
}) {
  return (
    <Pagination connection={connection}>
      {({nodes, isLoading, PreviousLink, NextLink}) => {
        const resourcesMarkup = nodes.map((node, index) =>
          children({node, index}),
        );

        return (
          <div className="pagination-wrapper">
            <div className="pagination-links">
              <PreviousLink>
                {isLoading ? 'Loading...' : '← Load previous'}
              </PreviousLink>
              <NextLink>
                {isLoading ? 'Loading...' : 'Load more →'}
              </NextLink>
            </div>
            {resourcesClassName ? (
              <div className={resourcesClassName}>{resourcesMarkup}</div>
            ) : (
              resourcesMarkup
            )}
          </div>
        );
      }}
    </Pagination>
  );
}
