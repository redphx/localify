'use strict';

const { Component, h, render } = window.preact;

class RulesTable extends Component {
  constructor(props) {
    super(props);

    this.save = this.save.bind(this);
    this.onClickAdd = this.onClickAdd.bind(this);
  }

  getRules() {
    let rules = [];
    this.ruleRefs.forEach((ref, index) => {
      if (ref) {
        rules.push(ref.getRule())
      }
    });

    return rules;
  }

  componentDidMount() {
    chrome.storage.local.get('rules', (data) => {
      let rules = data['rules'] || [];

      this.setState({
        rules,
      });
    });
  }

  onClickAdd() {
    this.props.getModal().show({
      type: 'add',
      onSubmit: (type, rule, index) => this.addRule(rule),
    });
  }

  addRule(rule) {
    let rules = this.getRules();
    rules.unshift(rule);

    this.save(rules);
  }

  updateRule() {
    let rules = this.getRules();
    this.save(rules);
  }

  removeRule(index) {
    let rules = this.getRules();
    rules.splice(index, 1);

    this.save(rules);
  }

  save(rules) {
    chrome.storage.local.set({
      rules,
    }, () => {
      chrome.runtime.sendMessage({
        type: 'reload-background-page',
      });

      this.setState({
        rules,
      });
    });
  }

  render() {
    if (!this.state.rules) {
      return;
    }

    this.ruleRefs = [];
    let rows = [];

    this.state.rules.forEach((rule, index) => {
      rows.push(h(RuleRow, {
        key: btoa(rule.url + rule.location),
        rule: rule,
        index: index,
        getModal: this.props.getModal,
        ref: (ref => this.ruleRefs.push(ref)),
        onEdit: () => this.updateRule(),
        onRemove: (index) => this.removeRule(index),
      }));
    });

    let isEmpty = rows.length === 0;
    if (isEmpty) {
      let emptyRow = h('tr', {},
        h('td', { colspan: 4 },
          h('div', { className: 'empty' },
            h('div', { className: 'empty-icon' },
              h('i', { className: 'far fa-meh fa-5x' })
            ),
            h('p', { className: 'empty-title h5' }, 'You don\'t have any rules yet'),
            h('div', { className: 'empty-action' },
              h('button', {
                  className: 'btn btn-primary',
                  onClick: this.onClickAdd,
                },
                h('i', { className: 'fas fa-plus' }),
                ' New Rule',
              ),
            ),
          ),
        ),
      );
      rows.push(emptyRow);
    }

    return (
      h('div', {},
        h('div', {},
          h('button', {
              className: 'btn btn-primary float-right',
              onClick: this.onClickAdd,
            },
            h('i', { className: 'fas fa-plus' }),
            ' New Rule',
          ),
        ),

        h('table', { className: 'table table-striped ' + (!isEmpty ? 'table-hover' : '') },
          h('thead', {},
            h('tr', {},
              h('th', {}, 'enable'),
              h('th', {}, 'url pattern'),
              h('th', {}, 'file location'),
              h('th', { className: 'text-right' }, 'commands'),
            ),
          ),
          h('tbody', {}, rows)
        ),
      )
    );
  }
}

class RuleRow extends Component {
  constructor(props) {
    super(props);

    this.state = {
      rule: props.rule,
    }

    this.onClickEdit = this.onClickEdit.bind(this);
    this.onClickRemove = this.onClickRemove.bind(this);
    this.onToggleEnable = this.onToggleEnable.bind(this);
  }

  onClickRemove() {
    if (confirm('Do you want to delete this rule?')) {
      this.props.onRemove(this.props.index);
    }
  }

  onClickEdit() {
    this.props.getModal().show({
      type: 'edit',
      index: this.props.index,
      rule: this.state.rule,
      onSubmit: (type, rule, index) => {
        this.setState({ rule }, () => this.props.onEdit());
      }
    });
  }

  onToggleEnable(e) {
    let rule = this.state.rule;
    rule.disable = !e.target.checked;
    this.setState({ rule }, () => this.props.onEdit());
  }

  render() {
    let rule = this.state.rule;

    return (
      h('tr', {
          className: rule.disable ? 'disabled-rule' : '',
        },
        h('td', {},
          h('div', { className: 'form-group' },
            h('label', { className: 'form-switch' },
              h('input', {
                type: 'checkbox',
                onChange: this.onToggleEnable,
                defaultChecked: rule.disable !== true,
              }),
              h('i', { className: 'form-icon' }),
            ),
          ),
        ),
        h('td', {}, rule.url),
        h('td', {},
          h('kbd', {}, '<FILES_DIR>/' + rule.location),
        ),
        h('td', { className: 'text-right' },
          h('button', {
              className: 'btn btn-primary btn-action',
              onClick: this.onClickEdit,
            },
            h('i', { className: 'fas fa-edit' })
          ),
          h('span', {}, ' '),
          h('button', {
              className: 'btn btn-action',
              onClick: this.onClickRemove,
            },
            h('i', { className: 'fas fa-trash' })
          ),
        ),
      )
    );
  }

  getRule() {
    return this.state.rule;
  }
}

class FormModal extends Component {
  constructor(props) {
    super(props);

    this.state = {
      type: props.type || 'add',
      isShowing: false,
      isValid: false,
      errors: {},
      rule: {
        url: '',
        location: '',
      },
      index: -1,
    };

    this.checkExistence = this.checkExistence.bind(this);
    this.onUrlChange = this.onUrlChange.bind(this);
    this.onLocationChange = this.onLocationChange.bind(this);
    this.onClickSubmit = this.onClickSubmit.bind(this);

    this.show = this.show.bind(this);
    this.hide = this.hide.bind(this);
  }

  show(props) {
    if (!props.rule || props.type === 'add') {
      props.rule = {
        url: '',
        location: '',
      }
    }

    this.setState({
      ...props,
      errors: {},
      isShowing: true,
    }, () => {
      if (props.type === 'edit') {
        this.onLocationChange();
        this.onUrlChange();
      }
    });
  }

  hide(e) {
    if (e) {
      e.preventDefault();
    }

    this.setState({
      isShowing: false,
    });
  }

  isValid() {
    return this.state.isValid
  }

  checkExistence(location) {
    if (!location) {
      this.state.errors.location = 'This field is required';
      this.setState(this.state);
      return;
    }

    let url = chrome.runtime.getURL('files/' + location);
    fetch(url, { method: 'HEAD' })
      .then((response) => {
        this.state.isValid = true
        this.state.errors.location = h('a', {
            href: url,
            target: '_blank',
            className: 'text-success',
          },
          'File exists ',
          h('i', { className: 'fas fa-external-link-alt'}),
        )

        this.setState(this.state)

      }).catch((err) => {
        this.state.isValid = false
        this.state.errors.location = h('a', {
            href: url,
            target: '_blank',
            className: 'text-error',
          },
          'File not found ',
          h('i', { className: 'fas fa-external-link-alt'}),
        );
        this.setState(this.state)
      });
  }

  onLocationChange() {
    this.setState({
      rule: {
        ...this.state.rule,
        location: this.locationRef.value,
      }
    });

    this.checkExistence(this.locationRef.value);
  }

  onUrlChange() {
    let url = this.urlRef.value;

    if (!url) {
      this.state.errors.url = 'This field is required';
    } else {
      delete this.state.errors.url;
    }

    this.setState({
      ...this.state,
      rule: {
        ...this.state.rule,
        url,
      }
    });
  }

  onClickSubmit() {
    if (this.state.onSubmit) {
      this.state.onSubmit(this.state.type, this.state.rule, this.state.index);
    }

    this.hide();
  }

  render() {
    let title = this.state.type === 'add' ? 'New Rule' : 'Edit Rule';
    let buttonLabel = this.state.type === 'add' ? 'Add' : 'Save';

    return (
      h('div', { className: 'modal ' + (this.state.isShowing ? 'active' : '')  },
        h('span', { className: 'modal-overlay' }),
        h('div', { className: 'modal-container' },
          h('div', { className: 'modal-header' },
            h('a', {
              className: 'btn btn-clear float-right',
              ariaLabel: 'Close',
              href: '#',
              onClick: this.hide,
            }),
            h('div', { className: 'modal-title h5' }, title),
          ),
          h('div', { className: 'modal-body' },
            h('div', { className: 'form-group ' + (this.state.errors.url ? 'has-error' : '') },
              h('label', { className: 'form-label', htmlFor: 'inp-url' },
                'Match this URL Pattern ',
                h('a', {
                    href: 'https://developer.chrome.com/extensions/match_patterns',
                    target: '_blank',
                  },
                  h('i', { className: 'fas fa-info-circle' }),
                ),
              ),
              h('input', {
                autoFocus: true,
                className: 'form-input ',
                type: 'text',
                id: 'inp-url',
                placeholder: 'URL Pattern',
                value: this.state.rule.url,
                ref: ref => this.urlRef = ref,
                onBlur: this.onUrlChange,
              }),
              h('p', { className: 'form-input-hint'}, this.state.errors.url || '\u00A0'),
            ),
            h('div', { className: 'form-group ' + (this.state.errors.location ? 'has-error' : '') },
              h('label', { className: 'form-label', htmlFor: 'inp-file-location' }, 'Redirect to Local File'),
              h('div', { className: 'input-group' },
                h('span', { className: 'input-group-addon' }, '<FILES_DIR>/'),
                h('input', {
                  className: 'form-input',
                  type: 'text',
                  id: 'inp-file-location',
                  placeholder: 'File Location',
                  value: this.state.rule.location,
                  ref: ref => this.locationRef = ref,
                  onKeyUp: this.onLocationChange,
                  onBlur: this.onLocationChange,
                }),
              ),
              h('p', { className: 'form-input-hint'}, this.state.errors.location || '\u00A0'),
            ),
          ),
          h('div', { className: 'modal-footer' },
            h('button', {
                className: 'btn btn-primary ' + (this.isValid() ? '' : 'disabled'),
                onClick: this.onClickSubmit,
              }, buttonLabel),
          ),
        ),
      )
    );
  }
}

const Header = () => {
  const manifestData = chrome.runtime.getManifest();

  return h('header', {
      className: 'navbar',
    },
      h('section', { className: 'navbar-section' },
        h('a', {
            className: 'navbar-brand mr-2',
            href: 'https://github.com/redphx/localify',
            target: '_blank',
          }, 'Localify'
      ),
      h('section', { className: 'navbar-section' },
        h('span', { className: 'text-gray' }, manifestData.version),
      ),
    ),
  );
};

class Help extends Component {

  componentWillMount() {
    chrome.runtime.getPlatformInfo(info => this.setState({ os: info.os }));
  }

  render() {
    let os = this.state.os;
    if (!os) {
      return;
    }

    let path = '<UNPACKED_EXTENSION_DIR>/files/'

    return (
      h('div', { className: 'help bg-dark' },
        h('p', {}, 'Put your files in this folder:'),
        h('code', { className: 'bg-gray' }, path),
      )
    );
  };
};

const Main = () => (
  h('main', {},
    h(RulesTable, {
      getModal: () => this.modalRef,
      ref: ref => this.tableRef = ref,
    }),
    h(Help),
    h(FormModal, {
      ref: ref => this.modalRef = ref,
    }),
  )
);

const App = () => (
  h('div', { id: 'app' },
    h(Header),
    h(Main),
  )
);

render(h(App), document.body);
