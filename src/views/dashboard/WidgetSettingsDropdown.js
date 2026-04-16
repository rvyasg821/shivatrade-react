import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Dropdown,
  DropdownToggle,
  DropdownMenu,
  DropdownItem,
} from 'reactstrap';
import { FiSettings } from 'react-icons/fi';
import {
  selectInvisibleWidgetNames,
  selectInvisibleWidgets,
  updateDashboardWidgets,
} from './store';

const WidgetVisibilityDropdown = ({ className = '' }) => {
  const dispatch = useDispatch();
  const invisibleWidgets = useSelector(selectInvisibleWidgets);
  const invisibleNames = useSelector(selectInvisibleWidgetNames);

  const [open, setOpen] = React.useState(false);
  const toggle = () => setOpen((p) => !p);

  const widgetMap = React.useMemo(() => {
    return invisibleWidgets.reduce((map, widget) => {
      map[widget.slug] = widget;
      return map;
    }, {});
  }, [invisibleWidgets]);

  const handleShow = (slug) => {
    const widget = widgetMap[slug];
    if (!widget) return;

    const payload = {
      widgets: invisibleWidgets.map((w) => ({
        _id: w._id,
        order: w.order,
        is_visible: w._id === widget._id ? true : w.is_visible,
      })),
    };
    dispatch(updateDashboardWidgets(payload));
  };

  if (invisibleNames.length === 0) return null;

  return (
    <Dropdown isOpen={open} toggle={toggle} className={className}>
      <DropdownToggle
        tag="span"
        data-toggle="dropdown"
        aria-expanded={open}
        className="nav-link dropdown-user-link"
      >
        <FiSettings size={22} className="text-white" />
      </DropdownToggle>

      <DropdownMenu right>
        {invisibleNames.map(({ slug, name }) => {
          const widget = widgetMap[slug];
          return (
            <DropdownItem
              key={widget._id}
              onClick={() => handleShow(slug)}
              className="text-wrap"
            >
              {name}
            </DropdownItem>
          );
        })}
      </DropdownMenu>
    </Dropdown>
  );
};

export default WidgetVisibilityDropdown;